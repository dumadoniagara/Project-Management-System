var express = require('express');
var router = express.Router();
let checkOption = {
    id: true,
    name: true,
    members: true
}

let checkOptionMember = {
    id: true,
    name: true,
    position: true
}

module.exports = (db) => {

    function projectsModel(sql) {
        return new Promise((resolve, reject) => {
            db.query(sql, (err, result) => {
                let data = result.rows;
                if (data.length == 0) {
                    reject(err)
                }
                for (i = 0; i < data.length; i++) {
                    if (data[i].members != null) {
                        let memberList = data[i].members.split(',');
                        data[i].members = memberList;
                    }
                }
                resolve(data)
                reject(err)
            })
        })
    }

    function usersModel() {
        return new Promise((resolve, reject) => {
            const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;
            db.query(sqlMembers, (err, result) => {
                let data = result.rows;
                resolve(data)
                reject(err)
            })
        })
    }

    function usersModelbyProjectId(id) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT CONCAT(firstname, ' ', lastname) AS fullname, members.role FROM users LEFT JOIN members ON users.userid = members.userid WHERE members.projectid = $1 ORDER BY fullname`;
            db.query(sql, [id], (err, result) => {
                let data = result.rows;
                resolve(data)
                reject(err)
            })
        })
    }


    let pageModel = () => {
        return new Promise((resolve, reject) => {
            const sqlPage = `SELECT COUNT(DISTINCT projectid) as total FROM projects`
            db.query(sqlPage, (err, result) => {
                let data = result.rows;
                resolve(data)
                reject(err)
            })
        })
    }

    let addProject = (form) => {
        return new Promise((resolve, reject) => {
            let sql = `INSERT INTO projects (name) VALUES ($1)`
            db.query(sql, [form.projectName], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function addMembers(form) {
        let values = [];
        return new Promise((resolve, reject) => {
            db.query(`SELECT MAX (projectid) FROM projects`, (err, data) => {
                let projectId = data.rows[0].max;
                resolve(projectId);
                reject(err);
                let sqlInsert = `INSERT INTO members (projectid, userid) VALUES `
                if (typeof form.members == 'object') {
                    form.members.forEach(item => {
                        values.push(`(${projectId}, ${item})`);
                    })
                    sqlInsert += values.join(', ');
                } else {
                    sqlInsert += `(${projectId}, ${form.members})`
                }
                db.query(sqlInsert, (err) => {
                    resolve();
                    reject(err);
                });
            });
        });
    }

    function deleteProject(id) {
        return new Promise((resolve, reject) => {
            let sql = `DELETE FROM projects WHERE projectid = $1`
            db.query(sql, [id], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function deleteProjectMembers(id) {
        return new Promise((resolve, reject) => {
            let sql = `DELETE FROM members WHERE projectid = $1`
            db.query(sql, [id], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function showMembers(id) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT * FROM members WHERE projectid = $1`, [id], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }

    function showMembersWithConstraint(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT userid, CONCAT(firstname,' ', lastname) AS fullname FROM users WHERE userid NOT IN (SELECT userid FROM members WHERE projectid = $1)`, [projectid], (err, data) => {
                let users = data.rows;
                resolve(users);
                reject(err);
            })
        })
    }

    function showProject(id) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT name, projectid FROM projects WHERE projectid = $1`, [id], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }
    function updateProjectName(form) {
        return new Promise((resolve, reject) => {
            db.query(`UPDATE projects SET name = $1 WHERE projectid = $2`, [form.projectName, form.projectId], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function deleteMember(form) {
        return new Promise((resolve, reject) => {
            let sqlDelete = `DELETE FROM members WHERE projectid = $1`;
            db.query(sqlDelete, [parseInt(form.projectId)], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function updateProjectMember(form) {
        return new Promise((resolve, reject) => {
            let values = [];
            let sqlInsert = `INSERT INTO members (projectid, userid) VALUES `
            if (typeof form.members == 'object') {
                form.members.forEach(item => {
                    values.push(`(${form.projectId}, ${item})`);
                })
                sqlInsert += values.join(', ');
            } else {
                sqlInsert += `(${form.projectId}, ${form.members})`
            }
            db.query(sqlInsert, (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function addProjectMember(form) {
        return new Promise((resolve, reject) => {
            let sqlInsert = `INSERT INTO members (projectid, userid, role) VALUES ($1,$2,$3)`
            db.query(sqlInsert, [form.projectId, form.user, form.role], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    // ============== ROUTES =========================================================

    router.get('/', function (req, res, next) {
        const { checkId, id, checkName, name, checkMember, memberId } = req.query;
        let isSearch = false;
        let query = [];
        let search = "";
        const page = req.query.page || 1;
        const limit = 100;
        const offset = (page - 1) * limit;
        let url = req.url.includes('page') ? req.url : `/projects?page=1&` + req.url.slice(2)

        console.log(req.query);
        if (checkId && id) {
            query.push(`projects.projectid = ${parseInt(id)}`);
            isSearch = true;
        }
        if (checkName && name) {
            query.push(`projects.name LIKE '%${name}%'`);
            isSearch = true;
        }
        if (checkMember && memberId) {
            query.push(`users.userid = ${parseInt(memberId)}`);
            isSearch = true;
        }

        if (isSearch) {
            search += `WHERE ${query.join(' AND ')}`;
        }
        console.log(search);

        const sqlAll = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,',' ORDER BY users.firstname, users.lastname) members FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid ${search} GROUP BY projects.projectid LIMIT ${limit} OFFSET ${offset}`;

        Promise.all([usersModel(), projectsModel(sqlAll), pageModel()])
            .then(result => {
                const [memberList, data, totalPage] = result;
                const pages = Math.ceil(totalPage[0].total / limit);
                res.status(200).render('projects/index', {
                    memberList,
                    data,
                    user: req.session.user,
                    checkOption,
                    pages,
                    totalPage,
                    page,
                    url
                })
            })
            .catch(err => {
                console.log(err);
            })
    });

    router.post('/option', function (req, res) {
        const { checkId, checkName, checkMembers } = req.body;
        checkOption.id = checkId;
        checkOption.name = checkName;
        checkOption.members = checkMembers;
        // console.log(checkOption);
        res.redirect('/projects');
    })

    router.get('/add', (req, res) => {
        const sqlMembers = `SELECT DISTINCT (userid), CONCAT(firstname, ' ', lastname) AS fullname FROM users ORDER BY fullname`;
        usersModel(sqlMembers)
            .then((memberList) => {
                res.render('projects/add', {
                    // res.status(200).json({
                    memberList
                })
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.post('/add', (req, res) => {
        let form = req.body;

        addProject(form)
            .then(() => {
                addMembers(form)
                    .then(() => {
                        res.redirect('/projects');
                    })
                    .catch(err => {
                        console.log(err);
                    })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.get('/delete/:id', (req, res) => {
        const id = parseInt(req.params.id);
        Promise.all([deleteProject(id), deleteProjectMembers(id)])
            .then(() => {
                res.redirect('/projects');
            })
            .catch((err) => {
                console.log(err);
            })
    })

    router.get('/edit/:id', (req, res) => {
        const id = parseInt(req.params.id);
        Promise.all([usersModel(), showMembers(id), showProject(id)])
            .then((data) => {
                let [memberList, memberProject, projectName] = data;
                let membersId = [];
                memberProject.forEach(item => {
                    membersId.push(item.userid);
                })

                res.render('projects/edit', {
                    // res.status(200).json({
                    memberList,
                    membersId,
                    projectName
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.post('/edit', (req, res) => {
        let form = req.body;
        Promise.all([updateProjectName(form), deleteMember(form)])
            .then(() => {
                updateProjectMember(form)
                    .then(() => {
                        res.redirect('/projects')
                    })
                    .catch(err => {
                        console.log(err);
                    })
            })
            .catch(err => {
                console.log(err);
            })
    })



    // =============== PROJECT DETAIL PAGE ==============

    router.get('/overview/:id', (req, res) => {
        const id = parseInt(req.params.id);
        Promise.all([showProject(id), usersModelbyProjectId(id)])
            .then((data) => {
                let [project, memberList] = data;
                // res.status(200).json({
                res.render('projects/overview', {
                    project,
                    memberList
                })

            })
            .catch(err => {
                console.log(err);
            })
    })




    router.get('/members/:id', (req, res) => {
        const id = parseInt(req.params.id);
        Promise.all([showProject(id), usersModelbyProjectId(id)])
            .then((data) => {
                let [project, memberList] = data;
                // res.status(200).json({
                res.render('projects/members', {
                    project,
                    memberList,
                    checkOptionMember
                })

            }).catch(err => {
                console.log(err);
            })
    })

    router.post('/members/:id', function (req, res) {
        const id = parseInt(req.params.id);
        const { checkId, checkName, checkPosition } = req.body;
        checkOptionMember.id = checkId;
        checkOptionMember.name = checkName;
        checkOptionMember.position = checkPosition;
        res.redirect(`/projects/members/${id}`);
    })

    router.get('/members/:id/add', (req, res) => {
        const id = req.params.id;
        Promise.all([showMembersWithConstraint(id), showProject(id)])
            .then(data => {
                let [users, project] = data;
                res.render('projects/members/add', {
                    // res.json({
                    users,
                    project
                })
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.post('/members/:id/add', (req, res) => {
        const id = req.params.id;
        const form = req.body;
        addProjectMember(form)
            .then(() => {
                res.redirect(`/projects/members/${id}`);
            })
            .catch(err => {
                console.log(err)
            })
    })

    // router.get('/test/:projectid', (req, res) => {
    //     const projectid = req.params.projectid;
    //     showMembersWithConstraint(projectid)
    //         .then(users => {
    //             res.status(200).json({
    //             res.render('/')
    //             users
    //         })
    //         .catch(err => {
    //             console.log(err)
    //         })
    // })


    return router;
}