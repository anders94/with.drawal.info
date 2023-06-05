const db = require('../../db');

module.exports = async (req, res, next) => {
    try {
	const { hash } = req.params;

	if (!hash)
            throw new Error('Missing hash field');

	const zurvey = await db.query(
	    `SELECT *, end_at < now() AS ended
             FROM zurveys
             WHERE hash = $1`,
            [hash]);

	if (zurvey.rows.length != 1)
	    throw new Error('Didn\'t find a zurvey with hash '+hash);
	if (zurvey.rows[0].obsolete || zurvey.rows[0].ended)
	    throw new Error('Sorry, that zurvey is no longer active.');

	const questions = await db.query(
	    `SELECT q.*,
               ARRAY(
                 SELECT ARRAY[id::TEXT, answer_option::TEXT]
                 FROM answer_options ao 
                 WHERE ao.question_id = q.id 
                 ORDER BY ao.ordinal ASC
               ) as answer_options 
             FROM questions q 
             WHERE q.zurvey_id = $1 
               AND q.obsolete = false 
             ORDER BY q.ordinal ASC`,
	    [zurvey.rows[0].id]);

	if (!questions.rows)
	throw new Error('Found no questions for zurvey '+zurvey.rows[0].id);
	
	// log it
	await db.query(
	    `INSERT INTO views
               (zurvey_id, ip, browser_string, session_id)
             VALUES
               ($1, $2, $3, $4)`,
	    [zurvey.rows[0].id, req.ip, req.headers['user-agent'], req.sessionID]);

	res.render('show', {
	    zurvey: zurvey.rows[0],
	    questions: questions.rows
	});
    }
    catch (e) {
	console.log(e);
	res.render('error', {error: e});
    }
    finally {
	return next;
    }
};
