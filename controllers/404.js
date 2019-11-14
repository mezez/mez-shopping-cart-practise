exports.pageNotFound = (req, res, next) => {
    res.render('404', {docTitle: '404'});
};