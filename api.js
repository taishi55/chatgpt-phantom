// get info of the searched urls from query
async function getSearchData(query, time, instruction) {
  // format query
  const url = "https://phantom-ghost-writer.vercel.app/api/youtube";

  query = query.replace(/\s/g, "+");
  const headers = new Headers({
    Origin: "https://chat.openai.com",
    "content-type": "application/json",
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify({
        query: query.replace(/\s/g, "+"),
        time,
        instruction,
      }),
      headers,
    });

    const result = await response.text();
    return result;
  } catch (error) {
    showErrorMessage(error);
    return "";
  }
}
