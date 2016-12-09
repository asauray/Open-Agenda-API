
var jwt = require('jsonwebtoken');
var fs = require('fs');

var query=require('./query');

var credentials=query.credentials;
var cert=query.cert;
var hash=query.hash;
var hashWithSalt=query.hashWithSalt;

// sign with RSA SHA256
var credentials = {
    key: fs.readFileSync('newkey.pem')
}

var cert = {
    pub: fs.readFileSync('cert.pem')
}

var next_facebook = function(ip_addr, facebook_token, facebook_id, facebook_email, user, created, res){
    query.getCentral().provider.query("UPDATE users set facebook_token=$1, ip_addr=$4, updated_at=NOW() where facebook_id=$2 OR facebook_email=$3 RETURNING edt_id", [facebook_token,  facebook_id, facebook_email, ip_addr], function(err, result){
        query.getCentral().done();
        if(err) {
            return console.error('error running query', err);
        }
        if(result.rows.length!=0){
            var token = jwt.sign({id: result.rows[0].edt_id, authenticated: true}, credentials.key, { algorithm: 'RS256'});
            if(created){
                fbImport.queryFacebook(result.rows[0].edt_id, facebook_id, facebook_token);
                res.statusCode=201;
                res.json({token: token, first_name: user.first_name, last_name: user.last_name, facebook_email: user.facebook_email});
            }
            else{
                res.statusCode=200;
                res.json({token: token, first_name: user.first_name, last_name: user.last_name, facebook_email: user.facebook_email});
            }
        }
        else{
            res.statusCode=401;
            res.send("An error occured when trying to create a new user");
        }
    });
}

module.exports = {
    providers: function(res){
        query.getCentral().provider.query("SELECT provider, name, image, primary_color, accent_color from providers", function(err, result){
            query.getCentral().done();
            if(err) {
                return console.error('error running query', err);
            }
            if(result.rows.length!=0){
                res.statusCode=200;
                res.send(result.rows);
            }
            else{
                res.statusCode=401;
                res.send(result.rows);
            }
        });
    },

    agendas: function(provider, entity, res){
        console.log("query agendas");
        if(query.getProviders()[provider]){
            query.getProviders()[provider].client.query("SELECT id, name, editable, agenda_entity_id, agenda_type_id, more, active, $2::text as provider, $3::text as entity from agendas where agenda_entity_id = $1", [entity, provider, entity], function(err, result){
                query.getProviders()[provider].done();
                if(err) {
                    return console.error('error running query', err);
                }
                res.statusCode=200;
                res.send(result.rows);
            });
        }
        else{
            res.statusCode=404;
            res.send();
        }

    },

    entities: function(provider, res){
        console.log("entities");
        if(query.getProviders()[provider]){
            query.getProviders()[provider].client.query("SELECT * from entities where public=true", function(err, result){
                query.getProviders()[provider].done();
                if(err) {
                    return console.error('error running query', err);
                }
                res.statusCode=200;
                res.send(result.rows);
            });
        }
        else{
            res.statusCode=404;
            res.send();
        }
    },
    user: function(user_id, authenticated, res){
        if(authenticated){
            query.getCentral().provider.query("SELECT edt_id, first_name, last_name, edt_email, facebook_email, created_at, updated_at FROM users where users.edt_id=$1 LIMIT 1", [user_id], function(err, result){
                query.getCentral().done();
                if(err) {
                    return console.error('error running query', err);
                }
                if(result.rows.length!=0){
                    res.statusCode=200;
                    res.send(result.rows);
                }
                else{
                    res.statusCode=401;
                    res.send(result.rows);
                }
            });
        }
        else{
            query.getCentral().provider.query("SELECT * from anonymous_users where id=$1 LIMIT 1", [user_id], function(err, result){
                query.getCentral().done();
                if(err) {
                    return console.error('error running query', err);
                }
                if(result.rows.length!=0){
                    res.statusCode=200;
                    res.send(result.rows);
                }
                else{
                    res.statusCode=401;
                    res.send(result.rows);
                }
            });
        }

    },

    events: function(user_id, authenticated, start_date, end_date, res){
        console.log("user_id="+JSON.stringify(user_id));
        if(authenticated){
            query.getCentral().provider.query("SELECT * FROM user_agendas where user_id=$1", [user_id], function(err, result){
                query.getCentral().done();
                if(err) {
                    return console.error('error running query', err);
                }
                // get promises from all query.getProviders()
                var promises=[];
                console.log("promises ready");
                result.rows.forEach(function(agenda){
                    console.log("agenda: "+agenda);
                    var sqlQuery=query.getProviders()[agenda.provider].client.query("SELECT agenda_events.id, $4::text as provider, agenda_events.agenda_id, to_char(start_time, 'YYYY-MM-DD') AS date, start_time, end_time, name, event_type_id, color_light, color_dark, agenda_events.updated_at, agenda_events.created_at, more FROM agenda_events LEFT JOIN event_types ON event_types.id=agenda_events.event_type_id where agenda_events.agenda_id=$1 AND start_time::date >= $2 AND start_time::date <= $3", [agenda.agenda_id, start_date, end_date, agenda.provider]);
                    sqlQuery.then(function(){
                        sqlQuery.getProviders()[agenda.provider].done();
                    });
                    promises.push(sqlQuery);
                });
                // when we have all replies
                Promise.all(promises).then(results => {
                    var events={};
                    console.log("promises finished: "+results.length);
                    results.forEach(function(result){
                        console.log("promise: "+JSON.stringify(result.rows));
                        result.rows.forEach(function(event){
                            if(!events[event.date]){
                                events[event.date] = [];
                            }
                            events[event.date].push(event);
                        });
                    });
                    res.statusCode=200;
                    res.send(events);
                });
            });
        }
        else{
            query.getCentral().provider.query("UPDATE anonymous_users set request_counter=request_counter+1, updated_at=NOW() where id=$1 RETURNING *", [user_id], function(err, result){
                query.getCentral().done();
                if(err) {
                    return console.error('error running query', err);
                }
                // get promises from all query.getProviders()
                var promises=[];
                console.log("promises ready");
                result.rows.forEach(function(anonymous_user){
                    if(anonymous_user.request_counter>30){
                        res.statusCode=429; // too many requests
                        res.json({});
                    }
                    else{
                        console.log("anonymous_user: "+anonymous_user);
                        if(anonymous_user.provider){
                            var query=query.getProviders()[anonymous_user.provider].client.query("SELECT agenda_events.id, $4::text as provider, agenda_events.agenda_id, to_char(start_time, 'YYYY-MM-DD') AS date, start_time, end_time, name, event_type_id, color_light, color_dark, agenda_events.updated_at, agenda_events.created_at, more FROM agenda_events LEFT JOIN event_types ON event_types.id=agenda_events.event_type_id where agenda_events.agenda_id=$1 AND start_time::date >= $2 AND start_time::date <= $3", [anonymous_user.agenda_id, start_date, end_date, anonymous_user.provider]);
                            query.then(function(){
                                query.getProviders()[agenda.provider].done();
                            });
                            promises.push(query);
                            Promise.all(promises).then(results => {
                                var events={};
                                console.log("promises finished: "+results.length);
                                results.forEach(function(result){
                                    console.log("promise: "+JSON.stringify(result.rows));
                                    result.rows.forEach(function(event){
                                        if(!events[event.date]){
                                            events[event.date] = [];
                                        }
                                        events[event.date].push(event);
                                    });
                                });
                                res.statusCode=200;
                                res.send(events);
                            });
                        }
                        else{
                            res.statusCode=200;
                            res.send({});
                        }
                    }
                });
            });
        }

    },
    user_agendas: function(user_id, authenticated, res){
        // ask the query.getCentral() server for agenda query.getProviders()
        console.log("authenticated="+authenticated);
        if(authenticated){
            query.getCentral().provider.query("SELECT * FROM user_agendas where user_id=$1", [user_id], function(err, result){
                query.getCentral().done();
                if(err) {
                    return console.error('error running query', err);
                }
                if(result.rows.length==0){
                    // if result=0 we will check our user
                    query.getCentral().provider.query("SELECT edt_id, first_name, last_name from users where edt_id=$1", [user_id], function(err, result){
                        query.getCentral().done();
                        if(err) {
                            return console.error('error running query', err);
                        }
                        if(result.rows.length==0){
                            // if result=0 then this user does not exist
                            res.statusCode=404;
                            res.json([]);
                        }
                        else{
                            // if it exists then it just has no agendas
                            res.statusCode=200;
                            res.json([]);
                        }
                    });
                }
                else{
                    // get promises from all query.getProviders()
                    var promises=[];
                    result.rows.forEach(function(agenda){
                        var sqlQuery = query.getProviders()[agenda.provider].client.query("select agendas.id, $2::text as provider, agenda_types.image as image, entities.name as entity, agendas.name, agendas.editable, agendas.agenda_entity_id, agendas.agenda_type_id, agendas.more, agendas.active from agendas LEFT JOIN agenda_types ON agendas.agenda_type_id=agenda_types.id LEFT JOIN entities ON agendas.agenda_entity_id=entities.id where agendas.id =$1", [agenda.agenda_id, agenda.provider]);
                        promises.push(sqlQuery);
                        sqlQuery.then(function(){
                            sqlQuery.getProviders()[agenda.provider].done();
                        });
                    });
                    console.log("promises ready");
                    Promise.all(promises).then(results => {
                        var agendas=[];
                        results.forEach(function(result){
                            result.rows.forEach(function(agenda){
                                agendas.push(agenda);
                            });
                        });
                        res.statusCode=200;
                        res.send(agendas);
                    });
                }
            });
        }
        else{
            query.getCentral().provider.query("SELECT * FROM anonymous_users where id=$1", [user_id], function(err, result){
                query.getCentral().done();
                if(err) {
                    res.statusCode=500;
                    res.send(agendas);
                }
                if(result.rows.length==0){
                    query.getCentral().provider.query("SELECT edt_id, first_name, last_name from users where edt_id=$1", [user_id], function(err, result){
                        query.getCentral().done();
                        if(err) {
                            return console.error('error running query', err);
                        }
                        if(result.rows.length==0){
                            // if result=0 then this user does not exist
                            res.statusCode=404;
                            res.json([]);
                        }
                        else{
                            // if it exists then it just has no agendas
                            res.statusCode=200;
                            res.json([]);
                        }
                    });
                }
                else{
                    var promises=[];
                    result.rows.forEach(function(anonymous_user){
                        if(anonymous_user.provider&&anonymous_user.agenda_id){
                            var query = query.getProviders()[agenda.provider].client.query("select agendas.id, $2::text as provider, agenda_types.image as image, entities.name as entity, agendas.name, agendas.editable, agendas.agenda_entity_id, agendas.agenda_type_id, agendas.more, agendas.active from agendas LEFT JOIN agenda_types ON agendas.agenda_type_id=agenda_types.id LEFT JOIN entities ON agendas.agenda_entity_id=entities.id where agendas.id =$1", [anonymous_user.agenda_id, anonymous_user.provider]);
                            promises.push(query);
                            query.then(function(){
                                query.getProviders()[anonymous_user.provider].done();
                            });
                        }
                    });
                    console.log("promises ready");
                    Promise.all(promises).then(results => {
                        var agendas=[];
                        console.log("promise results: "+JSON.stringify(results));
                        results.forEach(function(result){
                            result.rows.forEach(function(agenda){
                                console.log("agenda: "+JSON.stringify(agenda));
                                agendas.push(agenda);
                            });
                        });
                        res.statusCode=200;
                        res.send(agendas);
                    });
                }
            });
        }
    }
}