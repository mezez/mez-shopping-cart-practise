const bcrypt = require('bcryptjs');
const User = require('../models/user');
const keys = require('../config/keys');
const nodemailer = require('nodemailer');
const crypto = require('crypto'); //a built in node js module for creating random unique values
const { validationResult } = require('express-validator');

const myEmail = keys.EMAIL;

let transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: keys.email,
    pass: keys.password
  },
  tls: {
    rejectUnauthorized: false
  }
});

const sendEmail = ((sender, receiver, subject, message) => {
  let mailOptions = {
    from: sender,
    to: receiver,
    subject: subject,
    text: message
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
});

const sendHtmlEmail = ((sender, receiver, subject, html) => {
  let mailOptions = {
    from: sender,
    to: receiver,
    subject: subject,
    html: html
  };

  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });
});


exports.getLogin = (req, res, next) => {
  let message = req.flash('error');

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/login', {
    path: '/login',
    pageTitle: 'Login',
    errorMessage: message,
    oldInput: { email: '', password: ''},
    validationErrors: []
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/login',
      {
        path: '/login',
        pageTitle: 'Login',
        isAuthenticated: false,
        errorMessage: errors.array()[0].msg,
        oldInput: { email: email, password: password },
        validationErrors: errors.array()
      }); //422 denotes failed validation. calling render instead of redirect ensures
    //page does not reload
  }
  User.findOne({ email: email })
    .then(user => {
      if (!user) {
        return res.status(422).render('auth/login', {
          path: '/login',
          pageTitle: 'Login',
          isAuthenticated: false,
          errorMessage: 'Invalid email or password',
          oldInput: { email: email, password: password },
          validationErrors: []
        });
      }
      bcrypt.compare(password, user.password)
        .then(doMatch => {
          if (doMatch) {
            req.session.user = user;
            req.session.IsLoggedIn = true;
            return req.session.save(err => {
              console.log(err);
              res.redirect('/');
            });
          }
          //req.flash('error', 'Invalid email or password')
          return res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            isAuthenticated: false,
            errorMessage: 'Invalid email or password',
            oldInput: { email: email, password: password },
            validationErrors: []
          });
        })
        .catch(err => {
          console.log(err);
          res.redirect('/login');
        });

    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });

}

exports.getSignup = (req, res, next) => {
  let message = req.flash('error');

  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/signup', {
    path: '/signup',
    pageTitle: 'Signup',
    isAuthenticated: false,
    errorMessage: message,
    oldInput: { email: '', password: '', confirmPassword: '' },
    validationErrors: []
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('auth/signup',
      {
        path: '/signup',
        pageTitle: 'Signup',
        isAuthenticated: false,
        errorMessage: errors.array()[0].msg,
        oldInput: { email: email, password: password, confirmPassword: req.body.confirmPassword },
        validationErrors: errors.array() //full errors array
      }); //422 denotes failed validation. calling render instead of redirect ensures

  }
  //hash the password
  bcrypt.hash(password, 12)
    .then(hashedPassword => {
      //new user
      const user = new User({
        email: email, password: hashedPassword, cart: { items: [] }
      });

      return user.save();
    }).then(result => {
      const subject = 'Signup Email';
      message = 'Thank you for signing up. I hope you enjoy our app';
      sendEmail(myEmail, email, subject, message)
      res.redirect('/login');


    })
};

exports.postLogout = (req, res, next) => {
  //assume the user is logged in
  req.session.destroy((err) => {
    console.log(err);
    return res.redirect('/signup');
  });
}

exports.getReset = (req, res, next) => {
  let message = req.flash('error');
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render('auth/reset', {
    path: '/reset',
    pageTitle: 'Reset Password',
    errorMessage: message
  });
}

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      req.flash('error', 'Password reset unsuccessful');
      return res.redirect('/reset');
    }

    const token = buffer.toString('hex');
    let emailUser;
    User.findOne({ email: req.body.email }).then(user => {
      if (!user) {
        req.flash('error', 'Email is not associated with any user account');
        return res.redirect('/reset');
      }
      emailUser = user;
      user.resetToken = token;
      user.resetTokenExpiration = Date.now() + 3600000; //expires in one hour
      return user.save();

    }).then(result => {
      //the user has been updated in the database. send the token reset email
      const html = `
        <p>You requested a password reset</p>
        <p>Click <a href="http://localhost:3000/reset/${token}">here</a> to set a new password. The link is only valid for one hour</p>
      `;
      return sendHtmlEmail(myEmail, emailUser.email, 'Password Reset', html)

      //sendEmail(myEmail,user.email,"passwod reset","wow")
    }).catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });
  });
}

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } }).then(user => {

    let message = req.flash('error');
    if (message.length > 0) {
      message = message[0];
    } else {
      message = null;
    }
    res.render('auth/new-password', {
      path: '/new-password',
      pageTitle: 'New Password',
      errorMessage: message,
      userId: user._id.toString(),
      passwordToken: token
    });
  }).catch(err => {
    const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
  });
  //$gt means greater than, ie resetTokenExpiration is greater than current time




}

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let resetPassworduser;

  User.findOne({ resetToken: passwordToken, resetTokenExpiration: { $gt: Date.now() }, _id: userId })
    .then(user => {
      resetPassworduser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then(hashedPassword => {
      resetPassworduser.password = hashedPassword;
      resetPassworduser.resetToken = undefined;
      resetPassworduser.resetTokenExpiration = undefined;
      return resetPassworduser.save();
    }).then(result => {
      res.redirect('/login');
    })
    .catch(err => {
      const error = new Error(err);
      error.httpStatusCode(500);
      return next(error);
    });

}