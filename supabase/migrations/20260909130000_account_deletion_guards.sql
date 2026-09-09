-- A deleted/pending account's unexpired JWT must not be able to recreate data.
CREATE OR REPLACE FUNCTION public.account_is_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM auth.users u WHERE u.id = auth.uid()
    AND COALESCE(u.raw_app_meta_data->>'account_deletion_pending', 'false') <> 'true');
$$;
REVOKE ALL ON FUNCTION public.account_is_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_is_active() TO authenticated;

CREATE POLICY "Active account required" ON public.tutorials AS RESTRICTIVE
FOR ALL TO authenticated USING (public.account_is_active()) WITH CHECK (public.account_is_active());
CREATE POLICY "Active account required" ON public.sources AS RESTRICTIVE
FOR ALL TO authenticated USING (public.account_is_active()) WITH CHECK (public.account_is_active());
CREATE POLICY "Active account required" ON public.steps AS RESTRICTIVE
FOR ALL TO authenticated USING (public.account_is_active()) WITH CHECK (public.account_is_active());
CREATE POLICY "Active account required" ON public.api_tokens AS RESTRICTIVE
FOR ALL TO authenticated USING (public.account_is_active()) WITH CHECK (public.account_is_active());
CREATE POLICY "Active account required" ON storage.objects AS RESTRICTIVE
FOR ALL TO authenticated USING (public.account_is_active()) WITH CHECK (public.account_is_active());

-- Serialize content writes with the auth metadata update that freezes an account.
-- RLS alone is insufficient: already-authorized recorder/agent calls use service_role.
CREATE OR REPLACE FUNCTION public.lock_active_account(owner_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE metadata jsonb;
BEGIN
  SELECT u.raw_app_meta_data INTO metadata FROM auth.users u
    WHERE u.id = owner_id FOR SHARE;
  RETURN FOUND AND COALESCE(metadata->>'account_deletion_pending', 'false') <> 'true';
END;
$$;
REVOKE ALL ON FUNCTION public.lock_active_account(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.guard_content_account_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE owner_id uuid;
BEGIN
  IF TG_TABLE_NAME IN ('tutorials', 'api_tokens') THEN
    owner_id := NEW.user_id;
  ELSE
    SELECT t.user_id INTO owner_id FROM public.tutorials t WHERE t.id = NEW.tutorial_id;
  END IF;
  IF public.lock_active_account(owner_id) THEN RETURN NEW; END IF;
  -- Deletion may only privatize a pending owner's existing guides. Do not permit
  -- an in-flight service-role request to publish or otherwise modify them.
  IF TG_TABLE_NAME = 'tutorials' AND TG_OP = 'UPDATE' THEN
    IF NEW.visibility = 'private' AND NEW.is_public = false
      AND (to_jsonb(NEW) - ARRAY['visibility', 'is_public', 'updated_at'])
        = (to_jsonb(OLD) - ARRAY['visibility', 'is_public', 'updated_at'])
    THEN RETURN NEW; END IF;
  END IF;
  RAISE EXCEPTION 'Account is unavailable for content changes' USING ERRCODE = '42501';
END;
$$;
REVOKE ALL ON FUNCTION public.guard_content_account_write() FROM PUBLIC;
CREATE TRIGGER guard_content_account_write BEFORE INSERT OR UPDATE ON public.tutorials
FOR EACH ROW EXECUTE FUNCTION public.guard_content_account_write();
CREATE TRIGGER guard_content_account_write BEFORE INSERT OR UPDATE ON public.sources
FOR EACH ROW EXECUTE FUNCTION public.guard_content_account_write();
CREATE TRIGGER guard_content_account_write BEFORE INSERT OR UPDATE ON public.steps
FOR EACH ROW EXECUTE FUNCTION public.guard_content_account_write();
CREATE TRIGGER guard_content_account_write BEFORE INSERT OR UPDATE ON public.api_tokens
FOR EACH ROW EXECUTE FUNCTION public.guard_content_account_write();

-- Also stop already in-flight service-role uploads / flattened-image cache writes.
CREATE OR REPLACE FUNCTION public.guard_storage_account_write()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NEW.bucket_id IN ('screenshots', 'recordings', 'screenshots-flattened') AND NOT public.lock_active_account(split_part(NEW.name, '/', 1)::uuid) THEN
    RAISE EXCEPTION 'Account is unavailable for uploads' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_storage_account_write() FROM PUBLIC;
CREATE TRIGGER guard_storage_account_write BEFORE INSERT OR UPDATE ON storage.objects
FOR EACH ROW EXECUTE FUNCTION public.guard_storage_account_write();

CREATE OR REPLACE FUNCTION public.account_deletion_guard_ready()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$ SELECT true $$;
REVOKE ALL ON FUNCTION public.account_deletion_guard_ready() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.account_deletion_guard_ready() TO service_role;
