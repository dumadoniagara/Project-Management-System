var express = require('express');
var router = express.Router();
const bcrypt = require('bcrypt');
const saltRounds = 10;

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

// ============================
// localhost:3000/users/
// ===========================


module.exports = (db) => {

  // ================================ FUNCTION QUERY ===============================
  showUsers = (offset, search) => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT userid, email, CONCAT(firstname, ' ', lastname) AS fullname, position, type, isadmin FROM users ${search} ORDER BY userid ASC LIMIT 3 OFFSET ${offset} `;
      db.query(sql, [], (err, result) => {
        const data = result.rows;
        resolve(data);
        reject(err);
      })
    })
  }

  countPages = (search) => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT COUNT(userid) AS total FROM users ${search}`;
      db.query(sql, [], (err, result) => {
        const total = result.rows[0].total;
        resolve(total);
        reject(err);
      })
    })
  }

  addUser = (form) => {
    return new Promise((resolve, reject) => {
      let sql = `INSERT INTO users (email, password, firstname, lastname, position, type, isadmin)
      VALUES($1, $2, $3, $4, $5, $6, $7)`;
      db.query(sql, [form.email, form.password, form.firstName, form.lastName, form.position, form.type, form.isAdmin], (err, result) => {
        resolve();
        reject(err);
      })
    })
  }

  showUserById = (userid) => {
    return new Promise((resolve, reject) => {
      let sql = `SELECT userid, email,firstname, lastname, password, position, type, isadmin FROM users WHERE userid = $1`;
      db.query(sql, [userid], (err, result) => {
        const data = result.rows[0];
        resolve(data);
        reject(err);
      })
    })
  }

  updateUser = (userid, query, updateVal) => {
    return new Promise((resolve, reject) => {
      let sql = `UPDATE users SET ${query} WHERE userid = $1`;
      db.query(sql, [userid, ...updateVal], err => {
        let check = sql;
        resolve(check);
        reject(err);
      })
    })
  }


  // updateUserNoPass = (userid, form) => {
  //   return new Promise((resolve, reject) => {
  //     let sql = `UPDATE users SET firstname = $1, lastname = $2, email = $3, position = $5, type = $6, isadmin = $7 WHERE userid = $8`;
  //     db.query(sql, [form.firstName, form.lastName, form.email, form.position, form.type, form.isAdmin, userid], err => {
  //       resolve();
  //       reject(err);
  //     })
  //   })
  // }

  deleteUser = (userid) => {
    return new Promise((resolve, reject) => {
      let sqlMember = `DELETE FROM members WHERE userid = $1`;
      let sqlUser = `DELETE FROM users WHERE userid = $1`;
      let sqlIssue = `DELETE FROM issues WHERE assignee = $1`;
      db.query(sqlIssue, [userid], err => {
        if (err) res.status(500).json(err);
        db.query(sqlMember, [userid], err => {
          if (err) res.status(500).json(err);
          db.query(sqlUser, [userid], err => {
            resolve();
            reject(err);
          })
        })
      })
    })
  }
  // ======================================= ROUTES ==================================
  router.get('/',isLoggedIn, (req, res, next) => {
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

    Promise.all([showUsers(offset, search), countPages(search)])
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
          login : req.session.user
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
      login : req.session.user
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
    showUserById(userid)
      .then(user => {
        res.render('users/edit', {
          // res.json({
          link,
          user,
          login : req.session.user
        })
      })
      .catch(err => console.log(err))
  })

  router.post('/edit/:userid', isLoggedIn, (req, res) => {
    const userid = req.params.userid;
    const form = req.body;
    if (form.password) {
      bcrypt.hash(form.password, saltRounds, function (err, hash) {
        form.password = hash;
        if (err) return res.status(500).json({
          error: true,
          message: err
        })
        updateUser(userid, form)
          .then(() => {
            req.flash('userMessage', 'User updated successfully!');
            res.redirect('/users')
          })
          .catch(err => console.log(err));
      })
    } else {
      updateUserNoPass(userid, form)
        .then(() => {
          req.flash('userMessage', 'User updated successfully!');
          res.redirect('/users')
        })
        .catch(err => console.log(err));
    }
  })

  router.get('/delete/:userid', isLoggedIn, (req, res) => {
    const userid = req.params.userid;
    deleteUser(userid)
      .then(() => {
        req.flash('userMessage', 'User deleted successfully!');
        res.redirect('/users')
      })
      .catch(err => console.log(err))
  });

  router.post('/testedit/:userid', isLoggedIn, (req, res) => {
    const userid = parseInt(req.params.userid);
    const form = req.body;
    let countBinding = 2;
    let updateKey = [];
    let updateVal = [];
    for (const property in form) {
      if (form[property]) {
        updateKey.push(`${property} = $${countBinding}`);
        updateVal.push(form[property]);
        countBinding++;
      }
    }
    let check = [userid, ...updateVal];
    const query = updateKey.join(', ');
    updateUser(userid, query, updateVal)
      .then((test) => {
        console.log(test);
        res.json({
          message: 'update success',
          updateVal,
          query,
          check
        })
      })
      .catch(err => console.log(err));


  })

  return router;
}
