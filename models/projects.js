class Project {
   constructor(db) {
      this.db = db
   }

   static hallo() {
      return 'hallo';
   }

   static projectsModel(search, limit, offset, db) {
      return new Promise((resolve, reject) => {
         const sqlAll = `SELECT projects.projectid, projects.name, STRING_AGG (users.firstname || ' ' || users.lastname,',' ORDER BY users.firstname, users.lastname) members FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid ${search} GROUP BY projects.projectid LIMIT ${limit} OFFSET ${offset}`;
         db.query(sqlAll, (err, result) => {
            let data = result.rows;
            if (data.length == 0) {
               resolve(data = []);
            }
            for (let i = 0; i < data.length; i++) {
               if (data[i].members != null) {
                  let memberList = data[i].members.split(',');
                  data[i].members = memberList;
               }
            }
            resolve(data)
            reject(err)
         })
      })
   };

   static pageModel(search, db) {
      return new Promise((resolve, reject) => {
         const sqlPage = `SELECT COUNT(DISTINCT projects.projectid) as total FROM projects LEFT JOIN members ON projects.projectid = members.projectid LEFT JOIN users ON members.userid = users.userid ${search}`
         db.query(sqlPage, (err, result) => {
            let data = result.rows;
            if (data.length == 0) {
               resolve(data = [])
            }
            resolve(data)
            reject(err)
         })
      })
   }

   static addProject = (form, db) => {
      return new Promise((resolve, reject) => {
         let sql = `INSERT INTO projects (name) VALUES ($1)`
         db.query(sql, [form.projectName], (err) => {
            resolve();
            reject(err);
         })
      })
   }

   static addMembers(form, db) {
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

   static deleteProject(id, db) {
      return new Promise((resolve, reject) => {
         let sqlProject = `DELETE FROM projects WHERE projectid = $1`
         db.query(sqlProject, [id], (err) => {
            let sql = `DELETE FROM members WHERE projectid = $1`
            db.query(sql, [id], (err) => {
               resolve();
               reject(err);
            })
         })
      })
   }

   static showMembers(id, db) {
      return new Promise((resolve, reject) => {
         db.query(`SELECT * FROM members WHERE projectid = $1`, [id], (err, data) => {
            let result = data.rows;
            resolve(result);
            reject(err);
         })
      })
   }

   static showProject(projectid, db) {
      return new Promise((resolve, reject) => {
         db.query(`SELECT name, projectid FROM projects WHERE projectid = $1`, [projectid], (err, data) => {
            let result = data.rows[0];
            resolve(result);
            reject(err);
         })
      })
   }

   static updateProjectName(form, db) {
      return new Promise((resolve, reject) => {
         db.query(`UPDATE projects SET name = $1 WHERE projectid = $2`, [form.projectName, form.projectId], (err) => {
            resolve();
            reject(err);
         })
      })
   }

   static deleteMember(form, db) {
      return new Promise((resolve, reject) => {
         let sqlDelete = `DELETE FROM members WHERE projectid = $1`;
         db.query(sqlDelete, [parseInt(form.projectId)], (err) => {
            resolve();
            reject(err);
         })
      })
   }

   static updateProjectMember(form, db) {
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

   static showActivity(projectid, db) {
      return new Promise((resolve, reject) => {
         db.query(`SELECT activity.activityid, activity.title, activity.description, CONCAT(users.firstname,' ',users.lastname) AS authorname, (time AT TIME ZONE 'Asia/Jakarta'):: time AS timeactivity, (time AT TIME ZONE 'Asia/Jakarta'):: date AS dateactivity FROM activity LEFT JOIN users ON activity.author = users.userid WHERE projectid = $1 ORDER BY dateactivity DESC, timeactivity DESC`, [projectid], (err, data) => {
            let result = data.rows;
            resolve(result);
            reject(err);
         })
      })
   }

   static usersModelbyProjectId(projectid, search, limit, offset, db) {
      return new Promise((resolve, reject) => {
         const sql = `SELECT CONCAT(firstname, ' ', lastname) AS fullname, members.role, members.userid FROM users LEFT JOIN members ON users.userid = members.userid WHERE members.projectid = $1 ${search} ORDER BY fullname LIMIT ${limit} OFFSET ${offset} `;
         db.query(sql, [projectid], (err, result) => {
            let data = result.rows;
            resolve(data)
            reject(err)
         })
      })
   }

   static countPage(id, table, projectid, search, db) {
      return new Promise((resolve, reject) => {
         db.query(`SELECT COUNT(${id}) AS total FROM ${table} WHERE projectid = $1 ${search}`, [projectid], (err, data) => {
            let total = data.rows[0].total;
            resolve(total);
            reject(err);
         })
      })
   }

   static countTracker(projectid, db) {
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

   static showMembersWithConstraint(projectid, db) {
      return new Promise((resolve, reject) => {
         db.query(`SELECT userid, CONCAT(firstname,' ', lastname) AS fullname FROM users WHERE userid NOT IN (SELECT userid FROM members WHERE projectid = $1)`, [projectid], (err, data) => {
            let users = data.rows;
            resolve(users);
            reject(err);
         })
      })
   }

   static addProjectMember(form, db) {
      return new Promise((resolve, reject) => {
         let sqlInsert = `INSERT INTO members (projectid, userid, role) VALUES ($1,$2,$3)`
         db.query(sqlInsert, [form.projectId, form.user, form.role], (err) => {
            resolve();
            reject(err);
         })
      })
   }


}




module.exports = Project;