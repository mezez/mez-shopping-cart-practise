const Product = require('../models/product');
const fileHelper = require('../util/file');
const { validationResult } = require('express-validator');  

exports.getAddProduct = (req, res, next) => {
  return res.render('admin/edit-product', {
    pageTitle: 'Add Product',
    path: '/admin/add-product',
    editing: false,
    hasError: false,
    errorMessage: null,
    validationErrors: [],
    isAuthenticated: req.session.IsLoggedIn
  });
};

exports.postAddProduct = (req, res, next) => {
  const title = req.body.title;
  const image = req.file;
  console.log(image);
  
  const price = req.body.price;
  const description = req.body.description;
  if(!image){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true, 
      errorMessage: 'Attached file is not an image',
      validationErrors: [],
      product: {title: title, price: price, description: description},
      isAuthenticated: req.session.isLoggedIn
    });
  }
  
  const errors = validationResult(req);
  if(!errors.isEmpty()){
    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Add Product',
      path: '/admin/add-product',
      editing: false,
      hasError: true, 
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
      product: {title: title, price: price, description: description},
      isAuthenticated: req.session.isLoggedIn
    });
  }
  const imageUrl = image.path;
  const product = new Product({
    title: title,
    price: price,
    description: description,
    imageUrl: imageUrl,
    userId: req.user
  });
  product
    .save()
    .then(result => {
      // console.log(result);
      console.log('Created Product');
      res.redirect('/admin/products');
    })
    .catch(err => {
      //return res.status(500).redirect('/500')'
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error); //this will skip all middleware are go to the error handling middleware. see app.js
    });
};

exports.getEditProduct = (req, res, next) => {
  const editMode = req.query.edit;
  if (!editMode) {
    return res.redirect('/');
  }
  const prodId = req.params.productId;
  Product.findById(prodId)
    .then(product => {
      if (!product) {
        return res.redirect('/');
      }
      return res.render('admin/edit-product', {
        pageTitle: 'Edit Product',
        path: '/admin/edit-product',
        editing: editMode,
        product: product,
        hasError: false,
        errorMessage: null,
        validationErrors: [],
        isAuthenticated: req.session.isLoggedIn
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.postEditProduct = (req, res, next) => {
  const prodId = req.body.productId;
  const updatedTitle = req.body.title;
  const updatedPrice = req.body.price;
  const image = req.file;
  const updatedDesc = req.body.description;

  const errors = validationResult(req);

  if(!errors.isEmpty()){

    return res.status(422).render('admin/edit-product', {
      pageTitle: 'Edit Product',
      path: '/admin/edit-product',
      editing: true,
      hasError: true, 
      errorMessage: errors.array()[0].msg,
      validationErrors: errors.array(),
      product: {title: updatedTitle, price: updatedPrice, description: updatedDesc},
      isAuthenticated: req.session.isLoggedIn
    });
  }

  Product.findById(prodId)
    .then(product => {
      if(product.userId.toString() !== req.user._id.toString()){ //had to convert to string otherwise objectIds will also be compared for equality here and it fails
        return res.redirect('/');
      }
      product.title = updatedTitle;
      product.price = updatedPrice;
      product.description = updatedDesc;
      if(image){
        //delete old file
        fileHelper.deleteFile(product.imageUrl);
        product.imageUrl = image.path;
      }
      return product.save().then(result => {
        console.log('UPDATED PRODUCT!');
        res.redirect('/admin/products');
      });
    }).catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.getProducts = (req, res, next) => {
  Product.find({userId: req.user._id})
    // .select('title price -_id')
    // .populate('userId', 'name')
    .then(products => {
      console.log(products);
      res.render('admin/products', {
        prods: products,
        pageTitle: 'Admin Products',
        path: '/admin/products',
        isAuthenticated: req.session.IsLoggedIn
      });
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};

exports.postDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  //delete image related to product
  Product.findById(prodId)
  .then(product => {
    if (!product) {
      return next(new Error('product not found'));
    }
    fileHelper.deleteFile(product.imageUrl);
  })
  .catch(err => {
    next(err);
  })
  Product.deleteOne({_id:prodId, userId: req.user._id})
    .then(() => {
      console.log('DESTROYED PRODUCT');
      res.redirect('/admin/products');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
};
