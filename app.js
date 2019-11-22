const path = require('path');
const fs = require('fs');
const https = require('https');

const express = require('express');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const multer = require('multer');
const mongoose = require('mongoose');
const session = require('express-session');
const csrf = require('csurf');
const flash = require('connect-flash');
const MongoDBStore = require('connect-mongodb-session')(session);

const errorController = require('./controllers/error');
const User = require('./models/user');
const keys = require('./config/keys');

const app = express();

const MONGODB_URI = `mongodb+srv://${keys.DB_USERNAME}:${keys.DB_PASSWORD}@learn-zuf6u.mongodb.net/${keys.DB_NAME}`;
const MONGODB_URI_TEST = "mongodb://localhost/learn";
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});

const csrfProtection = csrf();

//run [ openssl req -nodes -new -x509 -keyout server.key -out server.cert ] on the cmd to generate the server certificate and key 
//if you want to setup ssl by yourself
//const privateKey = fs.readFileSync('server.key'); //block further execution until file is read, ie sync
//const certificate = fs.readFileSync('server.cert'); //block further execution until file is read, ie sync

const fileFilter = (req, file, cb) => {
  
  if(file.mimetype.toLowerCase() === 'image/png' || file.mimetype.toLowerCase() === 'image/jpg' || file.mimetype.toLowerCase() === 'image/jpeg'){
    cb(null, true);
  }else{
    cb(null, false);
  }
};
const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now());
  }
});

app.set('view engine', 'ejs');
app.set('views', 'views');

const adminRoutes = require('./routes/admin');
const shopRoutes = require('./routes/shop');
const authRoutes = require('./routes/auth');

const accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'}); //flags 'a' means appends to end of file ie for logs

app.use(helmet()); //adds extra security headers to requests. see documentation for more config
app.use(compression()); //compresses assets, css and js files for faster processing, images are not compressed though. see documentation for more config
app.use(morgan('combined', {stream: accessLogStream})); //used for logging. see documentation for more config
app.use(bodyParser.urlencoded({ extended: false }));
app.use(multer({ storage: fileStorage, fileFilter: fileFilter}).single('image')); //image is the input name for a file in edit-product ejs file
app.use(express.static(path.join(__dirname, 'public')));
app.use('/images',express.static(path.join(__dirname, 'images')));
app.use(session({secret: 'my secret', resave: false, saveUninitialized: false, store: store})); //in prod, secret should be a long string value
//important to run csrf after initializing session as csrf protection middleware uses the session middleware

app.use(flash());
app.use(csrfProtection);

app.use((req, res, next) => {
  if(!req.session.user){
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if(!user){
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next (new Error(err)); //just calling throw new error inside async code will not be detected by express and therefore will
      //not get into the general error handler, so should be enclosed in a next function. throw new error will get to the general error handler
      //in synchronous code however
    }); 
});

app.use((req, res, next) =>{
  res.locals.isAuthenticated = req.session.IsLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
})

app.use('/admin', adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);

app.get('/500',errorController.get500);

app.use(errorController.get404);

app.use((error, req, res, next) => {
  //res.status(error.httpStatusCode).render(...)
  res.redirect('/500',{
    pageTitle: 'Error!',
    path: '/500',
    isAuthenticated: req.session.isLoggedIn
  });
}); //express error handling middleware

mongoose
  .connect(
    MONGODB_URI_TEST, { useNewUrlParser: true }
    //MONGODB_URI, { useNewUrlParser: true }
  )
  .then(result => {
    app.listen(keys.PORT || 3000); //starts server using default http
    //https.createServer({key: privateKey, cert: certificate}, app)
    //.listen(keys.PORT || 3000); //starts server using ssl encryption
  })
  .catch(err => {
    console.log(err);
  });
