const API_BASE = 'http://127.0.0.1:10045';

const API = {
  post: async(path, data)=>{
    const fetchRes = await fetch(path, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    });
    return await fetchRes.json();
  }
};
