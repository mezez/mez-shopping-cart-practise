const express = require('express');
const { check, body } = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.get('/login', authController.getLogin);
router.get('/signup', authController.getSignup);
router.post('/login',
    [
        body('email').isEmail().withMessage('Please enter a valid email').normalizeEmail(),
        body('password').trim()
    ], authController.postLogin);
router.post('/signup', [
    check('email').isEmail().normalizeEmail().custom((value, { req }) => {
        //custom is not compulsory. Just demonstrating extra flexibility
        //also enclosing the checks must not be grouped in an array. Totally optional
        // if (value === 'test@test.com') {
        //     throw new Error('This email address is forbidden');
        // }

        return User.findOne({ email: value }).then(userDoc => {
            // A user already exists with the email
            if (userDoc) {
                //return new Promise.reject(new Error('Email exists already'));
                let promise = new Promise( (resolve, reject) =>{
                    reject(new Error('Email exists already'));
                });

                return promise;
            }
        });
    }).withMessage('Please enter a valid email'),
    //note that the second argument for body() is alternative to withMessage('error message')
    body('password', 'please enter a password with only numbers and texts and minimum of 5 characters').trim().isLength({ min: 5 }).isAlphanumeric(),
    body('confirmPassword').trim().custom((value, { req }) => {
        if (value !== req.body.password) {
            throw new Error('Passwords have to match');
        }
        return true;
    })
], authController.postSignup);
router.post('/logout', authController.postLogout);
router.get('/reset', authController.getReset);
router.post('/reset', authController.postReset);
router.get('/reset/:token', authController.getNewPassword);
router.post('/new-password', authController.postNewPassword);

module.exports = router;