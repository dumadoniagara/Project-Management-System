SELECT
    *
FROM
    projects
    JOIN members ON projects.projectid = members.projectid
    JOIN users ON members.userid = users.userid -- buat nampilin nama :
SELECT
    f.title,
    STRING_AGG (
        a.first_name || ' ' || a.last_name,
        ','
        ORDER BY
            a.first_name,
            a.last_name
    ) members
FROM
    film f
    INNER JOIN film_actor fa USING (film_id)
    INNER JOIN actor a USING (actor_id)
GROUP BY
    f.title;

-- buat nyari data members menggunakan CONCAT dan berdasarkan perbedaan userid
SELECT
    DISTINCT (userid),
    CONCAT(firstname, ' ', lastname) AS fullname
FROM
    users
ORDER BY
    fullname