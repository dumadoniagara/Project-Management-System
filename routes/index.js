var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');

function isLoggedIn(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
}

/* GET home page. */
module.exports = (db) => {
  router.get('/', function (req, res, next) {
    res.render('login',{messages : req.flash('loginInfo')});
  });

  router.post('/login', (req, res) => {
    const sql = 'SELECT * FROM users WHERE email = $1'
    const email = [req.body.email];
    db.query(sql, email, (err, data) => {
      if (err) {
        req.flash('loginInfo', 'Terjadi kesalahan, silahkan coba lagi nanti');
        return res.redirect('/');
      }
      if (data.rows.length == 0) {
        req.flash('loginInfo', 'email or password wrong');
        return res.redirect('/');
      }
      bcrypt.compare(req.body.password, data.rows[0].password, function (err, result) {
        if (err) {
          req.flash('loginInfo', 'terjadi kesalahan, silahkan coba lagi nanti');
          return res.redirect('/');
        }
        if (result) {
          req.session.user = data.rows[0];
          res.render('projects', { user: req.session.user });
        } else {
          req.flash('loginInfo', 'email or password wrong');
          res.redirect('/');
        }
      })
    });
  })

  router.get('/projects', isLoggedIn, function (req, res, next) {
    res.render('projects', { user: req.session.user });
  });

  router.get('/profile', isLoggedIn, function (req, res) {
    res.render('profile');
  })

  router.get('/logout', (req, res) => {
    req.session.destroy(function (err) {
      res.redirect('/');
    })
  })

  return router;
}
