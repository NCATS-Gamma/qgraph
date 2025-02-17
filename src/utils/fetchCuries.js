import API from '~/API';

export default async function fetchCuries(entity, displayAlert, cancel, biolinkType) {
  // Get list of curies that match this search term
  const response = await API.nameResolver.entityLookup(entity, 1000, cancel, biolinkType);
  if (response.status === 'error') {
    displayAlert('error',
      'Failed to contact name resolver to search curies. Please try again later.');
    return [];
  }

  if (!Array.isArray(response)) {
    return [];
  }

  return response.map(({
    curie, label, types, taxa,
  }) => ({
    name: label,
    categories: types,
    ids: [curie],
    taxa,
  }));
}
