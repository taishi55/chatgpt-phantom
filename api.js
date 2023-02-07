// get info of the searched urls from query
async function getSearchData(query, time, num) {
  // query, time, region (all string types)
  // format query
  query = query.replace(/\s/g, "+");
  const url = `https://phantom-ghost-writer.vercel.app/api/youtube?query=${query}&time=${time}&num=${num}`;

  const headers = new Headers({
    Origin: "https://chat.openai.com",
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    const result = await response.json();
    return result;
  } catch (error) {
    showErrorMessage(error);
    return "";
  }
}
