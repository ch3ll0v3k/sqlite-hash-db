window.addEventListener('load', async()=>{
  const loader = document.querySelector('#loader');
  window.showLoader = ()=>loader.style.display = ''; 
  window.hideLoader = ()=>loader.style.display = 'none'; 

});
