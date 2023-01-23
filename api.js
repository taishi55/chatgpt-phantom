// get info of the searched urls from query
async function getSearchData(q, t, r) {
  // query, time, region (all string types)
  // format query
  q = q.replace(/\s/g, "+");
  const url = `https://phantom-ghost-writer.vercel.app/api/search?q=${q}&t=${t}&r=${r}`;

  const headers = new Headers({
    Origin: "https://chat.openai.com",
  });

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });

    const result = await response.text();
    return result;
  } catch (error) {
    showErrorMessage(error);
    return "";
  }
}
