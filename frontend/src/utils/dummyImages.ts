/**
 * Curated dummy pictures and resilient fallback image collections
 * for StayFinder properties, checkout, and payment verification.
 */

// High-resolution curated dummy images from Unsplash CDN
export const DUMMY_PROPERTY_IMAGES = {
  // Ideal for primary payment & checkout testing (coastal modern studio)
  testProperty: [
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80', // Exterior luxury villa & pool
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', // Modern living room & floor-to-ceiling glass
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?auto=format&fit=crop&w=1200&q=80', // Master bedroom suite
    'https://images.unsplash.com/photo-1556912172-45b7abe8b7e1?auto=format&fit=crop&w=1200&q=80', // Gourmet kitchen & marble island
    'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=80', // Luxury spa bathroom
    'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', // Sunset beach & private deck
  ],

  // Categorized dummy pictures by property type
  villa: [
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1200&q=80',
  ],
  apartment: [
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1502005229762-ee1b2b800539?auto=format&fit=crop&w=1200&q=80',
  ],
  cabin: [
    'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1542718610-a1a4c7cb0c95?auto=format&fit=crop&w=1200&q=80',
  ],
  loft: [
    'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1560184897-ae75f418493e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
  ],
  house: [
    'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1543349689-9a4d426bee8e?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1528360983277-13d401cdc186?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=1200&q=80',
  ],
};

// Default universal fallback image
export const DEFAULT_PROPERTY_FALLBACK =
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80';

/**
 * Returns a guaranteed valid image URL for a property cover.
 */
export function getSafePropertyImageUrl(
  imagePath?: string | null,
  propertyId: number = 0,
  propertyType: string = 'villa'
): string {
  if (imagePath && typeof imagePath === 'string' && imagePath.trim().length > 0) {
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    // Local storage path
    return `/storage/${imagePath.replace(/^\/+/, '')}`;
  }

  // Pick a thematic dummy picture by property type
  const normalizedType = propertyType.toLowerCase() as keyof typeof DUMMY_PROPERTY_IMAGES;
  const list = DUMMY_PROPERTY_IMAGES[normalizedType] || DUMMY_PROPERTY_IMAGES.testProperty;
  const index = Math.abs(propertyId) % list.length;
  return list[index] || DEFAULT_PROPERTY_FALLBACK;
}

/**
 * Returns a complete gallery array of at least 4-6 high quality dummy pictures
 * for property modal inspection and checkout previews.
 */
export function getPropertyGalleryImages(
  existingImages?: Array<{ image_path: string; is_primary?: boolean }> | null,
  propertyType: string = 'villa',
  _propertyId: number = 0
): string[] {
  const result: string[] = [];

  if (existingImages && existingImages.length > 0) {
    existingImages.forEach((img) => {
      if (img && img.image_path) {
        const fullUrl = img.image_path.startsWith('http')
          ? img.image_path
          : `/storage/${img.image_path.replace(/^\/+/, '')}`;
        if (!result.includes(fullUrl)) {
          result.push(fullUrl);
        }
      }
    });
  }

  // If gallery has fewer than 4 images, supplement with curated dummy images
  if (result.length < 4) {
    const normalizedType = propertyType.toLowerCase() as keyof typeof DUMMY_PROPERTY_IMAGES;
    const typePool = DUMMY_PROPERTY_IMAGES[normalizedType] || [];
    const generalPool = DUMMY_PROPERTY_IMAGES.testProperty;
    const combined = [...typePool, ...generalPool];

    for (const dummy of combined) {
      if (!result.includes(dummy)) {
        result.push(dummy);
      }
      if (result.length >= 6) break;
    }
  }

  return result.length > 0 ? result : DUMMY_PROPERTY_IMAGES.testProperty;
}
