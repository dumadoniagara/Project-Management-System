var express = require('express');
var router = express.Router();
var moment = require('moment');
const path = require('path');
const Project = require('../models/projects')
const Users = require('../models/users')

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

let checkOptionIssue = {
    id: true,
    subject: true,
    tracker: true,
    description: true,
    status: true,
    priority: true,
    assignee: true,
    startDate: true,
    dueDate: true,
    estimateTime: true,
    spentTime: true,
    done: true,
    targetVersion: true,
    author: true,
    createdDate: true,
    updatedDate: true,
    closedDate: true,
    file: true,
}

const isLoggedIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/');
    }
}

module.exports = (db) => {

    function usersModelbyProjectId(projectid, search, limit, offset) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT CONCAT(firstname, ' ', lastname) AS fullname, members.role, members.userid FROM users LEFT JOIN members ON users.userid = members.userid WHERE members.projectid = $1 ${search} ORDER BY fullname LIMIT ${limit} OFFSET ${offset} `;
            db.query(sql, [projectid], (err, result) => {
                let data = result.rows;
                resolve(data)
                reject(err)
            })
        })
    }

    // function showMembers(id) {
    //     return new Promise((resolve, reject) => {
    //         db.query(`SELECT * FROM members WHERE projectid = $1`, [id], (err, data) => {
    //             let result = data.rows;
    //             resolve(result);
    //             reject(err);
    //         })
    //     })
    // }

    function showUser(userid, projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT members.userid, CONCAT(firstname,' ', lastname) AS fullname, members.role FROM members LEFT JOIN users ON members.userid = users.userid WHERE members.userid = $1 AND members.projectid = $2`, [userid, projectid], (err, data) => {
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

    // function showProject(projectid) {
    //     return new Promise((resolve, reject) => {
    //         db.query(`SELECT name, projectid FROM projects WHERE projectid = $1`, [projectid], (err, data) => {
    //             let result = data.rows[0];
    //             resolve(result);
    //             reject(err);
    //         })
    //     })
    // }
    // function updateProjectName(form) {
    //     return new Promise((resolve, reject) => {
    //         db.query(`UPDATE projects SET name = $1 WHERE projectid = $2`, [form.projectName, form.projectId], (err) => {
    //             resolve();
    //             reject(err);
    //         })
    //     })
    // }

    // function deleteMember(form) {
    //     return new Promise((resolve, reject) => {
    //         let sqlDelete = `DELETE FROM members WHERE projectid = $1`;
    //         db.query(sqlDelete, [parseInt(form.projectId)], (err) => {
    //             resolve();
    //             reject(err);
    //         })
    //     })
    // }

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

    function editMember(form, userid) {
        return new Promise((resolve, reject) => {
            db.query(`UPDATE members SET role = $1 WHERE projectid = $2 AND userid = $3`, [form.role, form.projectId, userid], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function deleteMemberById(projectid, userid) {
        return new Promise((resolve, reject) => {
            let sqlDelete = `DELETE FROM members WHERE projectid = $1 AND userid = $2`;
            db.query(sqlDelete, [projectid, userid], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function showIssues(projectid, search, limit, offset) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT issues.*, CONCAT(users.firstname,' ',users.lastname) as authorname FROM issues LEFT JOIN users ON issues.author = users.userid WHERE issues.projectid = $1 ${search} ORDER BY issues.issueid ASC LIMIT ${limit} OFFSET ${offset}`, [projectid], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }

    function countTracker(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT COUNT(CASE WHEN tracker = 'bug' THEN 1 ELSE NULL END) AS totalbug,
            COUNT(CASE WHEN tracker = 'feature' THEN 1 ELSE NULL END) AS totalfeature,
            COUNT(CASE WHEN tracker = 'support' THEN 1 ELSE NULL END) AS totalsupport,
            COUNT(CASE WHEN tracker = 'bug' AND status != 'closed' THEN 1 ELSE NULL END) AS bugopen,
            COUNT(CASE WHEN tracker = 'feature' AND status != 'closed' THEN 1 ELSE NULL END) AS featureopen,
            COUNT(CASE WHEN tracker = 'support' AND status != 'closed' THEN 1 ELSE NULL END) AS supportopen
       FROM issues WHERE projectid = $1`, [projectid], (err, data) => {
                let result = data.rows[0];
                resolve(result);
                reject(err);
            })
        })
    }

    function countPage(id, table, projectid, search) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT COUNT(${id}) AS total FROM ${table} WHERE projectid = $1 ${search}`, [projectid], (err, data) => {
                let total = data.rows[0].total;
                resolve(total);
                reject(err);
            })
        })
    }

    function showParentIssues(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT subject, tracker FROM issues WHERE projectid = $1 ORDER BY issueid ASC`, [projectid], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }

    function showIssueById(projectid, issueid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT issues.*, CONCAT(users.firstname,' ',users.lastname) as authorname FROM issues LEFT JOIN users ON issues.author = users.userid WHERE issues.projectid = $1 AND issues.issueid = $2 `, [projectid, issueid], (err, data) => {
                let result = data.rows[0];
                resolve(result);
                reject(err);
            })
        })
    }

    function addIssue(form, authorid, fileName) {
        return new Promise((resolve, reject) => {
            if (fileName) {
                let sqlInsert = `INSERT INTO issues (projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, files, createddate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())`
                db.query(sqlInsert, [form.projectId, form.tracker, form.subject, form.description, form.status, form.priority, parseInt(form.assignee), form.startDate, form.dueDate, parseInt(form.estimatedTime), parseInt(form.done), authorid, fileName], (err) => {
                    resolve();
                    reject(err);
                })
            } else {
                let sqlInsert = `INSERT INTO issues (projectid, tracker, subject, description, status, priority, assignee, startdate, duedate, estimatedtime, done, author, createddate) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`
                db.query(sqlInsert, [form.projectId, form.tracker, form.subject, form.description, form.status, form.priority, parseInt(form.assignee), form.startDate, form.dueDate, parseInt(form.estimatedTime), parseInt(form.done), authorid], (err) => {
                    resolve();
                    reject(err);
                })
            }
        })
    }

    function updateIssue(issueid, form) {
        return new Promise((resolve, reject) => {
            let closeddate = false;
            if (form.status == 'closed') {
                closeddate = true;
            }
            if (form.file) {
                let sqlInsert = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, parenttask = $8, spenttime = $9, targetversion = $10,  files = $11, updateddate = $12${closeddate ? `, closeddate = NOW() ` : " "}WHERE issueid = $13`
                db.query(sqlInsert, [form.subject, form.description, form.status, form.priority, parseInt(form.assignee), form.dueDate, parseInt(form.done), form.parentTask, parseInt(form.spentTime), form.targetVersion, form.file, 'NOW()', issueid], (err) => {
                    resolve();
                    reject(err);
                })
            } else {
                let sqlInsert = `UPDATE issues SET subject = $1, description = $2, status = $3, priority = $4, assignee = $5, duedate = $6, done = $7, parenttask = $8, spenttime = $9, targetversion = $10, updateddate = $11${closeddate ? `, closeddate = NOW() ` : " "}WHERE issueid = $12`
                db.query(sqlInsert, [form.subject, form.description, form.status, form.priority, parseInt(form.assignee), form.dueDate, parseInt(form.done), form.parentTask, parseInt(form.spentTime), form.targetVersion, 'NOW()', issueid], (err) => {
                    resolve();
                    reject(err);
                })
            }
        })
    }

    recordActivity = (form, issueid, authorid, projectid) => {
        return new Promise((resolve, reject) => {
            let sql = `INSERT INTO activity (title, description, author, projectid, time) VALUES($1, $2, $3, $4, NOW())`;
            let title = `${form.subject} #${issueid} (${form.tracker}) - [${form.status}]`;
            let spentString = `${form.oldSpent}-${form.spentTime}`;
            let doneString = `${form.oldDone}-${form.done}`;
            let description = `${spentString}/${doneString}`;
            db.query(sql, [title, description, authorid, projectid], err => {
                resolve();
                reject(err);
            })
        })
    }


    function deleteIssue(projectid, issueid) {
        return new Promise((resolve, reject) => {
            let sql = `DELETE FROM issues WHERE projectid = $1 AND issueid = $2`
            db.query(sql, [projectid, issueid], (err) => {
                resolve();
                reject(err);
            })
        })
    }

    function showAssignee(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT users.userid, CONCAT(firstname,' ', lastname) AS fullname FROM members LEFT JOIN users ON members.userid = users.userid WHERE members.projectid = $1`, [projectid], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }

    function showActivity(projectid) {
        return new Promise((resolve, reject) => {
            db.query(`SELECT activity.activityid, activity.title, activity.description, CONCAT(users.firstname,' ',users.lastname) AS authorname, (time AT TIME ZONE 'Asia/Jakarta'):: time AS timeactivity, (time AT TIME ZONE 'Asia/Jakarta'):: date AS dateactivity FROM activity LEFT JOIN users ON activity.author = users.userid WHERE projectid = $1 ORDER BY dateactivity DESC, timeactivity DESC`, [projectid], (err, data) => {
                let result = data.rows;
                resolve(result);
                reject(err);
            })
        })
    }

    manipulateActivity = (activity) => {
        activity.forEach(item => {
            item.dateactivity = moment(item.dateactivity).format('YYYY-MM-DD');
            item.timeactivity = moment(item.timeactivity, 'HH:mm:ss.SSS').format('HH:mm:ss');
            item.description = item.description.split('/').map(item => {
                return item.split('-');
            })
            item.spent = item.description[0];
            item.done = item.description[1];
        })
        let allDate = activity.map(value => value.dateactivity);
        let uniqueDate = allDate.filter((value, index) => allDate.indexOf(value) == index);
        return uniqueDate.map(date => {
            return {
                date, data: activity.filter((value) => value.dateactivity == date)
            }
        })
    }

    // ================================== ROUTES ================================
    router.get('/', isLoggedIn, function (req, res, next) {
        const { checkId, id, checkName, name, checkMember, memberId } = req.query;
        const link = 'projects';
        let isSearch = false;
        let query = [];
        let search = "";
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        const url = req.url == '/' ? `/?page=1` : req.url;

        if (checkId && id) {
            query.push(`projects.projectid = ${parseInt(id)}`);
            isSearch = true;
        }
        if (checkName && name) {
            query.push(`projects.name ILIKE '%${name}%'`);
            isSearch = true;
        }
        if (checkMember && memberId) {
            query.push(`users.userid = ${parseInt(memberId)}`);
            isSearch = true;
        }

        if (isSearch) {
            search += `WHERE ${query.join(' AND ')}`;
        }
        Promise.all([Users.usersModel(db), Project.projectsModel(search, limit, offset, db), Project.pageModel(search, db)])
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
                    url,
                    link,
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err);
            })
    });

    router.post('/option', isLoggedIn, function (req, res) {
        const { checkId, checkName, checkMembers } = req.body;
        checkOption.id = checkId;
        checkOption.name = checkName;
        checkOption.members = checkMembers;
        res.redirect('/projects');
    })

    router.get('/add', isLoggedIn, (req, res) => {
        const link = 'projects';
        Users.usersModel(db)
            .then((memberList) => {
                res.render('projects/add', {
                    memberList,
                    link,
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.post('/add', isLoggedIn, (req, res) => {
        let form = req.body;
        Project.addProject(form, db)
            .then(() => {
                Project.addMembers(form, db)
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

    router.get('/delete/:id', isLoggedIn, (req, res) => {
        const id = parseInt(req.params.id);
        Promise.all([Project.deleteProject(id, db)])
            .then(() => {
                console.log('joss')
                res.redirect('/projects');
            })
            .catch((err) => {
                console.log(err);
            })
    })

    router.get('/edit/:id', isLoggedIn, (req, res) => {
        const link = 'projects';
        const id = parseInt(req.params.id);
        Promise.all([Users.usersModel(db), Project.showMembers(id, db), Project.showProject(id, db)])
            .then((data) => {
                let [memberList, memberProject, project] = data;
                let membersId = [];
                memberProject.forEach(item => {
                    membersId.push(item.userid);
                })

                res.render('projects/edit', {
                    memberList,
                    membersId,
                    project,
                    link,
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.post('/edit', isLoggedIn, (req, res) => {
        let form = req.body;
        Promise.all([Project.updateProjectName(form, db), Project.deleteMember(form, db)])
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


    // ========================== ROUTES PROJECT DETAIL =================================

    router.get('/overview/:projectid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        const search = "";
        Promise.all([showProject(projectid), usersModelbyProjectId(projectid, search, 'ALL', 0), countTracker(projectid)])
            .then((data) => {
                let [project, memberList, tracker] = data;
                res.render('projects/overview', {
                    project,
                    memberList,
                    link,
                    tracker,
                    projectid,
                    projectPath: 'overview',
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.get('/members/:projectid', isLoggedIn, (req, res) => {
        const url = req.url == `/members/${req.params.projectid}` ? `/members/${req.params.projectid}/?page=1` : req.url;
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        let isSearch = false;
        const { checkId, id, checkName, name, checkRole, role } = req.query;
        let query = [];
        let search = "";

        if (checkId && id) {
            query.push(`members.userid = ${parseInt(id)}`);
            isSearch = true;
        }
        if (checkName && name) {
            query.push(`CONCAT(users.firstname,' ',users.lastname) ILIKE '%${name}%'`);
            isSearch = true;
        }
        if (checkRole && role) {
            query.push(`members.role = '${role}'`);
            isSearch = true;
        }

        if (isSearch) {
            search += `AND ${query.join(' AND ')}`;
        }

        Promise.all([showProject(projectid), usersModelbyProjectId(projectid, search, 3, offset), countPage('users.userid', 'members LEFT JOIN users ON members.userid = users.userid', projectid, search)])
            .then((data) => {
                let [project, memberList, totalMembers] = data;
                let pages = Math.ceil(totalMembers / limit);
                res.render('projects/members/index', {
                    project,
                    memberList,
                    checkOptionMember,
                    link,
                    page,
                    url,
                    pages,
                    projectPath: 'members',
                    login: req.session.user
                })
            }).catch(err => {
                console.log(err);
            })
    })

    router.post('/members/:id', isLoggedIn, function (req, res) {
        const id = parseInt(req.params.id);
        const { checkId, checkName, checkPosition } = req.body;
        checkOptionMember.id = checkId;
        checkOptionMember.name = checkName;
        checkOptionMember.position = checkPosition;
        res.redirect(`/projects/members/${id}`);
    })

    router.get('/members/:id/add', isLoggedIn, (req, res) => {
        const link = 'projects';
        const id = parseInt(req.params.id);
        Promise.all([showMembersWithConstraint(id), showProject(id)])
            .then(data => {
                let [users, project] = data;
                res.render('projects/members/add', {
                    // res.json({
                    users,
                    project,
                    link,
                    projectPath: 'members',
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.post('/members/:id/add', isLoggedIn, (req, res) => {
        const id = parseInt(req.params.id);
        const form = req.body;
        addProjectMember(form)
            .then(() => {
                res.redirect(`/projects/members/${id}`);
            })
            .catch(err => {
                console.log(err)
            })
    })

    router.get('/members/:projectid/edit/:userid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        const userid = parseInt(req.params.userid);
        Promise.all([showProject(projectid), showUser(userid, projectid)])
            .then((data) => {
                let [project, user] = data;
                res.render('projects/members/edit', {
                    // res.json({
                    project,
                    user,
                    link,
                    projectPath: 'members',
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.post('/members/:projectid/edit/:userid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid)
        const userid = parseInt(req.params.userid);
        const form = req.body;
        editMember(form, userid)
            .then(() => {
                res.redirect(`/projects/members/${projectid}`)
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.get('/members/:projectid/delete/:userid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        const userid = parseInt(req.params.userid);
        deleteMemberById(projectid, userid)
            .then(() => {
                res.redirect(`/projects/members/${projectid}`)
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.get('/issues/:projectid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const url = req.url == `/issues/${req.params.projectid}` ? `/issues/${req.params.projectid}/?page=1` : req.url;
        const page = req.query.page || 1;
        const limit = 3;
        const offset = (page - 1) * limit;
        const projectid = parseInt(req.params.projectid);

        let isSearch = false;
        const { checkId, id, checkSubject, subject, checkTracker, tracker } = req.query;
        let query = [];
        let search = "";

        if (checkId && id) {
            query.push(`issues.issueid = ${parseInt(id)}`);
            isSearch = true;
        }
        if (checkSubject && subject) {
            query.push(`issues.subject ILIKE '%${subject}%'`);
            isSearch = true;
        }
        if (checkTracker && tracker) {
            query.push(`issues.tracker = '${tracker}'`);
            isSearch = true;
        }

        if (isSearch) {
            search += `AND ${query.join(' AND ')}`;
        }

        Promise.all([showProject(projectid), showIssues(projectid, search, limit, offset), showAssignee(projectid), countPage('issueid', 'issues', projectid, search)])
            .then((data) => {
                let [project, issues, assignee, total] = data;
                const pages = Math.ceil(total / limit)
                res.render('projects/issues/index', {
                    // res.json({
                    project,
                    issues,
                    checkOptionIssue,
                    messages: req.flash('issuesMessage'),
                    moment,
                    assignee,
                    url,
                    pages,
                    page,
                    link,
                    projectPath: 'issues',
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    // Option column 
    router.post('/issues/:projectid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        let { checkId,
            checkSubject,
            checkTracker,
            checkDescription,
            checkStatus,
            checkPriority,
            checkAssignee,
            checkStartDate,
            checkDueDate,
            checkEstimateTime,
            checkSpentTime,
            checkDone,
            checkTargetVersion,
            checkAuthor,
            checkCreatedDate,
            checkUpdatedDate,
            checkClosedDate,
            checkFile
        } = req.body;

        checkOptionIssue.id = checkId;
        checkOptionIssue.subject = checkSubject;
        checkOptionIssue.tracker = checkTracker;
        checkOptionIssue.description = checkDescription;
        checkOptionIssue.status = checkStatus;
        checkOptionIssue.priority = checkPriority;
        checkOptionIssue.assignee = checkAssignee;
        checkOptionIssue.startDate = checkStartDate;
        checkOptionIssue.dueDate = checkDueDate;
        checkOptionIssue.estimateTime = checkEstimateTime;
        checkOptionIssue.spentTime = checkSpentTime;
        checkOptionIssue.done = checkDone;
        checkOptionIssue.author = checkAuthor;
        checkOptionIssue.targetVersion = checkTargetVersion;
        checkOptionIssue.createdDate = checkCreatedDate;
        checkOptionIssue.updatedDate = checkUpdatedDate;
        checkOptionIssue.closedDate = checkClosedDate;
        checkOptionIssue.file = checkFile;
        res.redirect(`/projects/issues/${projectid}`);
    })

    // render add-issue
    router.get('/issues/:projectid/add', isLoggedIn, (req, res) => {
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        const search = "";
        Promise.all([usersModelbyProjectId(projectid, search, 'ALL', 0), showProject(projectid)])
            .then((data) => {
                let [users, project] = data;
                res.render('projects/issues/add', {
                    users,
                    project,
                    link,
                    projectPath: 'issues',
                    login: req.session.user
                })
            })
            .catch(err => {
                console.log(err);
            })
    })

    router.post('/issues/:projectid/add', isLoggedIn, (req, res) => {
        const authorid = req.session.user.userid;
        const projectid = parseInt(req.params.projectid);
        let form = req.body;
        if (req.files) {
            let file = req.files.file;
            let fileName = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-");
            addIssue(form, authorid, fileName)
                .then(() => {
                    file.mv(path.join(__dirname, "..", "public", "upload", fileName), function (err) {
                        if (err) return res.status(500).send(err);
                        req.flash('issuesMessage', 'New issues added successfully! File uploaded');
                        res.redirect(`/projects/issues/${projectid}`);
                    });
                })
                .catch(err => {
                    console.log(err);
                })
        } else {
            addIssue(form, authorid)
                .then(() => {
                    req.flash('issuesMessage', 'New issues added successfully!');
                    res.redirect(`/projects/issues/${projectid}`)
                })
                .catch(err => {
                    console.log(err);
                })
        }
    })

    router.get('/issues/:projectid/delete/:issueid', isLoggedIn, (req, res) => {
        const projectid = parseInt(req.params.projectid);
        const issueid = parseInt(req.params.issueid);
        deleteIssue(projectid, issueid)
            .then(() => {
                req.flash('issuesMessage', 'Issue has been deleted');
                res.redirect(`/projects/issues/${projectid}`)
            })
            .catch(err => {
                console.log(err);
            })
    })

    // render edit-issue
    router.get('/issues/:projectid/edit/:issueid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        const issueid = parseInt(req.params.issueid);
        const authorid = req.session.userid;
        const search = "";
        Promise.all([usersModelbyProjectId(projectid, search, 'ALL', 0), showProject(projectid), showIssueById(projectid, issueid), showParentIssues(projectid)])
            .then((data) => {
                let [users, project, issue, parentIssues] = data;
                showUser(issue.assignee, projectid)
                    .then((assignee) => {
                        res.render('projects/issues/edit', {
                            // res.json({
                            users,
                            project,
                            moment,
                            parentIssues,
                            issue,
                            assignee,
                            link,
                            projectPath: 'issues',
                            login: req.session.user
                        })
                    })
            })
            .catch(err => {
                console.log(err);
            })
    })


    // post edit-issue
    router.post('/issues/:projectid/edit/:issueid', isLoggedIn, (req, res) => {
        const issueid = parseInt(req.params.issueid);
        const projectid = parseInt(req.params.projectid);
        const authorid = req.session.user.userid;
        let form = req.body;
        if (req.files) {
            let file = req.files.file;
            form.file = file.name.toLowerCase().replace("", Date.now()).split(" ").join("-");
            Promise.all([recordActivity(form, issueid, authorid, projectid), updateIssue(issueid, form)])
                .then(() => {
                    file.mv(path.join(__dirname, "..", "public", "upload", form.file), function (err) {
                        if (err) return res.status(500).send(err);
                        req.flash('issuesMessage', 'Issue updated');
                        res.redirect(`/projects/issues/${projectid}`)
                    })
                })
                .catch(err => console.log(err));
        } else {
            Promise.all([recordActivity(form, issueid, authorid, projectid), updateIssue(issueid, form)])
                .then(() => {
                    req.flash('issuesMessage', 'Issue updated');
                    res.redirect(`/projects/issues/${projectid}`)
                })
                .catch(err => console.log(err));
        }
    })

    router.get('/activity/:projectid', isLoggedIn, (req, res) => {
        const link = 'projects';
        const projectid = parseInt(req.params.projectid);
        Promise.all([showProject(projectid), showActivity(projectid)])
            .then((data) => {
                let [project, rawActivity] = data;
                let activity = manipulateActivity(rawActivity);
                activity.forEach(item => {
                    if (item.date == moment().format('YYYY-MM-DD')) {
                        item.date = 'Today';
                    } else if (item.date == moment().subtract(1, 'days').format('YYYY-MM-DD')) {
                        item.date = 'Yesterday';
                    } else {
                        item.date = moment(item.date).format("MMMM Do, YYYY")
                    }

                })

                res.render('projects/activity/index', {
                    project,
                    moment,
                    activity,
                    link,
                    projectPath: 'activity',
                    login: req.session.user
                })
            })

    })


    return router;
}