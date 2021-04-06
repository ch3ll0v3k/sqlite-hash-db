
module.exports = (App)=>{

  const method = 'post';
  const path = '/search-by-any/';

  App.express[ method ]( path, async(req,res)=>{

    try{

      const searchBy = (req.body['searchBy'] || '').trim();

      if( searchBy.length < 3 )
        return res.json({success: false, message: 'search-by: must be >= 3 characters', data: []});

      const searchByRes = await App.DB.findAllByAnyValue(searchBy);
      // console.json(searchByRes.data);

      res.json( searchByRes );

    }catch(e){
      console.error(` error: [${req.part}]: ${e.error} `);
      res.json({success: false, message: e.message, data: []});
    }
  });

  return { path, method };

}