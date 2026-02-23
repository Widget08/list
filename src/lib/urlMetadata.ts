export async function fetchUrlMetadata(url: string) {
  try {
    const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (data.status === 'success') {
      return {
        title: data.data.title || '',
        description: data.data.description || '',
        image: data.data.image?.url || '',
        url: data.data.url || url,
      };
    }
  } catch (error) {
    console.error('Failed to fetch URL metadata:', error);
  }

  return {
    title: '',
    description: '',
    image: '',
    url: url,
  };
}

export function isValidUrl(string: string): boolean {
  try {
    new URL(string);
    return true;
  } catch {
    return false;
  }
}
