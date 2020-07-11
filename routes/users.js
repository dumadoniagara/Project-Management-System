var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;
const Users = require('../models/users');

const isLoggedIn = (req, res, next) => {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/');
  }
}

let checkOption = {
  id: true,
  name: true,
  position: true,
  email: true,
  type: true,
  role: true
}

module.exports = (db) => {
  router.get('/', isLoggedIn, (req, res, next) => {
    const url = req.url == '/' ? `/?page=1` : req.url;
    const link = 'users';
    const page = req.query.page || 1;
    const limit = 3;
    const offset = (page - 1) * limit;
    let isSearch = false;
    let search = "";
    let query = [];
    const { checkId, id, checkName, name, checkEmail, email, checkType, type, checkPosition, position } = req.query;

    if (checkName && name) {
      isSearch = true;
      query.push(`CONCAT(firstname,' ',lastname) ILIKE '%${name}%'`);
    }
    if (checkId && id) {
      isSearch = true;
      query.push(`userid = ${parseInt(id)}`);
    }
    if (checkEmail && email) {
      isSearch = true;
      query.push(`email = '${email}'`);
    }
    if (checkPosition && position) {
      isSearch = true;
      query.push(`position = '${position}'`);
    }
    if (checkType && type) {
      isSearch = true;
      query.push(`type = '${type}'`);
    }

    if (isSearch) {
      search += `WHERE ${query.join(' AND ')}`;
    }

    Promise.all([Users.showUsers(offset, search, db), Users.countPages(search, db)])
      .then(data => {
        let [users, total] = data;
        let pages = Math.ceil(total / limit);
        res.render('users/index', {
          // res.json({
          checkOption,
          users,
          page,
          pages,
          url,
          messages: req.flash('userMessage'),
          link,
          login: req.session.user
        })
      })
      .catch(err => console.log(err));
  })

  router.post('/', isLoggedIn, (req, res) => {
    const { checkId, checkName, checkPosition, checkType, checkEmail } = req.body;
    checkOption.id = checkId;
    checkOption.name = checkName;
    checkOption.position = checkPosition;
    checkOption.type = checkType;
    checkOption.email = checkEmail;
    res.redirect('/users');
  })

  router.get('/add', isLoggedIn, (req, res) => {
    const link = 'users';
    res.render('users/add', {
      link,
      login: req.session.user
    })
  })

  router.post('/add', isLoggedIn, (req, res) => {
    const form = req.body;
    bcrypt.hash(form.password, saltRounds, function (err, hash) {
      // hash password
      form.password = hash;
      if (err) return res.status(500).json({
        error: true,
        message: err
      })
      addUser(form)
        .then(() => {
          req.flash('userMessage', 'New user added successfully!');
          res.redirect('/users')
        })
        .catch(err => console.log(err));
    })
  })

  router.get('/edit/:userid', isLoggedIn, (req, res) => {
    const link = 'users';
    const userid = req.params.userid;
    Users.showUserById(userid, db)
      .then(user => {
        res.render('users/edit', {
          link,
          user,
          login: req.session.user
        })
      })
      .catch(err => console.log(err))
  })

  router.get('/delete/:userid', isLoggedIn, (req, res) => {
    const userid = req.params.userid;
    Users.deleteUser(userid, db)
      .then(() => {
        req.flash('userMessage', 'User deleted successfully!');
        res.redirect('/users')
      })
      .catch(err => console.log(err))
  });

  router.post('/edit/:userid', (req, res) => {
    if (!req.body.password) {
      let sql = `UPDATE users
    SET firstname=$1, lastname=$2, position=$3, type=$4, isadmin=$5
    WHERE userid=$6`
      db.query(sql, [req.body.firstname, req.body.lastname, req.body.position, req.body.type, req.body.isadmin, req.params.userid], err => {
        if (err) console.log(err);
        res.redirect('/users')
      })
    } else if (req.body.password) {
      bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
        if (err) res.status(500).json(err);
        let sql = `UPDATE users
    SET firstname=$1, lastname=$2, position=$3, type=$4, isadmin=$5, password=$6
    WHERE userid=$7`
        db.query(sql, [req.body.firstname, req.body.lastname, req.body.position, req.body.type, req.body.isadmin, hash, req.params.userid], err => {
          if (err) console.log(err);
          res.redirect('/users')
        })
      })
    }
  })
  return router;
}
