-- A revision is a normal private tutorial, editable in the existing editor.
ALTER TABLE public.tutorials
  ADD COLUMN revision_of uuid REFERENCES public.tutorials(id) ON DELETE CASCADE,
  ADD COLUMN revision_base text,
  ADD COLUMN revision_published_at timestamptz;
ALTER TABLE public.tutorials ADD CONSTRAINT tutorial_revisions_stay_private
  CHECK (revision_of IS NULL OR (visibility = 'private' AND NOT is_public AND public_token IS NULL));
CREATE UNIQUE INDEX tutorials_one_open_revision ON public.tutorials(revision_of)
  WHERE revision_of IS NOT NULL AND revision_published_at IS NULL;

CREATE FUNCTION public.tutorial_content_hash(p_id uuid) RETURNS text
LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT md5(jsonb_build_object(
    'title', t.title, 'description', t.description,
    'sources', (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id), '[]') FROM sources s WHERE s.tutorial_id = t.id),
    'steps', (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id), '[]') FROM steps s WHERE s.tutorial_id = t.id)
  )::text) FROM tutorials t WHERE t.id = p_id;
$$;

-- The service copies image files to the destination folder before calling this
-- transaction. Each copied source retains all native recorder metadata.
CREATE FUNCTION public.begin_tutorial_revision(p_owner uuid, p_original uuid, p_revision uuid, p_base text)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE original tutorials; existing tutorials;
BEGIN
  IF NOT coalesce(auth.role() = 'service_role' OR auth.uid() = p_owner, false) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO original FROM tutorials WHERE id = p_original AND user_id = p_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Tutorial not found'; END IF;
  IF original.revision_of IS NOT NULL THEN RAISE EXCEPTION 'Use the existing revision'; END IF;
  SELECT * INTO existing FROM tutorials WHERE revision_of = p_original AND revision_published_at IS NULL;
  IF FOUND THEN RETURN existing.id; END IF;
  IF tutorial_content_hash(p_original) IS DISTINCT FROM p_base THEN RAISE EXCEPTION 'Tutorial changed; reread and retry'; END IF;
  INSERT INTO tutorials(id,user_id,title,description,status,revision_of,revision_base)
    VALUES(p_revision,p_owner,original.title,original.description,'draft',p_original,p_base);
  INSERT INTO sources SELECT (jsonb_populate_record(NULL::sources, to_jsonb(s) || jsonb_build_object(
    'id', md5(p_revision::text || s.id::text)::uuid, 'tutorial_id', p_revision,
    'screenshot_url', CASE WHEN s.screenshot_url IS NULL THEN NULL ELSE p_owner::text || '/' || p_revision::text || '/revision-' || s.id::text END
  ))).* FROM sources s WHERE s.tutorial_id = p_original;
  INSERT INTO steps SELECT (jsonb_populate_record(NULL::steps, to_jsonb(s) || jsonb_build_object(
    'id', md5(p_revision::text || s.id::text)::uuid, 'tutorial_id', p_revision,
    'source_id', CASE WHEN s.source_id IS NULL THEN NULL ELSE md5(p_revision::text || s.source_id::text)::uuid END
  ))).* FROM steps s WHERE s.tutorial_id = p_original;
  RETURN p_revision;
END;
$$;

CREATE FUNCTION public.publish_tutorial_revision(p_owner uuid, p_revision uuid, p_content text)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE revision tutorials; original tutorials;
BEGIN
  IF NOT coalesce(auth.role() = 'service_role' OR auth.uid() = p_owner, false) THEN RAISE EXCEPTION 'Unauthorized'; END IF;
  SELECT * INTO revision FROM tutorials WHERE id = p_revision AND user_id = p_owner;
  IF NOT FOUND OR revision.revision_of IS NULL THEN RAISE EXCEPTION 'Revision not found'; END IF;
  SELECT * INTO original FROM tutorials WHERE id = revision.revision_of AND user_id = p_owner FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Original tutorial not found'; END IF;
  SELECT * INTO revision FROM tutorials WHERE id = p_revision AND user_id = p_owner FOR UPDATE;
  IF revision.revision_published_at IS NOT NULL THEN RETURN original.id; END IF;
  IF tutorial_content_hash(original.id) IS DISTINCT FROM revision.revision_base THEN RAISE EXCEPTION 'Original changed; reconcile a new revision before publishing'; END IF;
  IF tutorial_content_hash(revision.id) IS DISTINCT FROM p_content THEN RAISE EXCEPTION 'Revision changed; reread and retry'; END IF;
  INSERT INTO sources SELECT (jsonb_populate_record(NULL::sources, to_jsonb(s) || jsonb_build_object(
    'id', md5(original.id::text || s.id::text)::uuid, 'tutorial_id', original.id,
    'screenshot_url', CASE WHEN s.screenshot_url IS NULL THEN NULL ELSE p_owner::text || '/' || original.id::text || '/revision-' || s.id::text END
  ))).* FROM sources s WHERE s.tutorial_id = revision.id
    AND NOT EXISTS (SELECT 1 FROM sources previous WHERE previous.tutorial_id = original.id
      AND md5(revision.id::text || previous.id::text)::uuid = s.id);
  DELETE FROM steps WHERE tutorial_id = original.id;
  INSERT INTO steps SELECT (jsonb_populate_record(NULL::steps, to_jsonb(s) || jsonb_build_object(
    'id', md5(original.id::text || s.id::text)::uuid, 'tutorial_id', original.id,
    'source_id', CASE WHEN s.source_id IS NULL THEN NULL ELSE coalesce(
      (SELECT previous.id FROM sources previous WHERE previous.tutorial_id = original.id
        AND md5(revision.id::text || previous.id::text)::uuid = s.source_id),
      md5(original.id::text || s.source_id::text)::uuid) END
  ))).* FROM steps s WHERE s.tutorial_id = revision.id;
  UPDATE tutorials SET title = revision.title, description = revision.description, status = 'ready' WHERE id = original.id;
  UPDATE tutorials SET revision_published_at = now() WHERE id = revision.id;
  RETURN original.id;
END;
$$;

REVOKE ALL ON FUNCTION public.tutorial_content_hash(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.begin_tutorial_revision(uuid,uuid,uuid,text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.publish_tutorial_revision(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.tutorial_content_hash(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.begin_tutorial_revision(uuid,uuid,uuid,text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.publish_tutorial_revision(uuid,uuid,text) TO authenticated, service_role;

-- Serialize content writes with revision creation/publication, including editor writes.
CREATE FUNCTION public.lock_tutorial_content() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM id FROM tutorials WHERE id = OLD.tutorial_id FOR UPDATE;
    RETURN OLD;
  END IF;
  PERFORM id FROM tutorials WHERE id = NEW.tutorial_id FOR UPDATE;
  RETURN NEW;
END;
$$;
CREATE TRIGGER lock_source_tutorial BEFORE INSERT OR UPDATE OR DELETE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.lock_tutorial_content();
CREATE TRIGGER lock_step_tutorial BEFORE INSERT OR UPDATE OR DELETE ON public.steps
  FOR EACH ROW EXECUTE FUNCTION public.lock_tutorial_content();
