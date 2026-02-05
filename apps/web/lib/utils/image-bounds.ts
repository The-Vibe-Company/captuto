export interface ImageBounds {
  offsetX: number;
  offsetY: number;
  displayWidth: number;
  displayHeight: number;
}

/**
 * Compute the actual rendered position and size of an image within a container
 * when the image uses object-fit: contain (or equivalent).
 *
 * When the image aspect ratio differs from the container, object-contain
 * letterboxes the image. This function returns the offset and size of
 * the visible image area so annotations can be mapped correctly.
 */
export function getImageBounds(
  containerWidth: number,
  containerHeight: number,
  naturalWidth: number,
  naturalHeight: number
): ImageBounds {
  if (naturalWidth === 0 || naturalHeight === 0) {
    return {
      offsetX: 0,
      offsetY: 0,
      displayWidth: containerWidth,
      displayHeight: containerHeight,
    };
  }

  const containerAspect = containerWidth / containerHeight;
  const imageAspect = naturalWidth / naturalHeight;

  let displayWidth: number;
  let displayHeight: number;

  if (imageAspect > containerAspect) {
    // Image is wider: full width, letterbox top/bottom
    displayWidth = containerWidth;
    displayHeight = containerWidth / imageAspect;
  } else {
    // Image is taller: full height, pillarbox left/right
    displayHeight = containerHeight;
    displayWidth = containerHeight * imageAspect;
  }

  return {
    offsetX: (containerWidth - displayWidth) / 2,
    offsetY: (containerHeight - displayHeight) / 2,
    displayWidth,
    displayHeight,
  };
}
