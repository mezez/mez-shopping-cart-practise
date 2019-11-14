module.exports = (req, res, next) => {

    if(!req.session.IsLoggedIn){
        //user is not logged in
        return res.redirect('/login');
      }
      next();
}