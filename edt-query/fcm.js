var FCM = require('fcm-push');
var serverKey = process.env.FIREBASE_KEY;
var fcm = new FCM(serverKey);

module.exports = {


	updateClientsAgendas: function(update_type, sender_id, provider, agenda_id, agenda_name){
		var topic="/topics/"+provider+'_'+agenda_id;
		var message = {
    				to: topic,
    				data: {
        				type: 'update',
						entity_type: 'agenda',
						update_type: update_type,
						update_method: 'agendas',
						sender_id: sender_id,
						entity_name: agenda_name
    				}
        };

        //promise style
        fcm.send(message)
    	.then(function(response){})
    	.catch(function(err){
        		console.log("Something has gone wrong!");
        		console.error(err);
		});

	},
	updateClientsEvents: function(update_type, sender_id, provider, agenda_id, event_name){
		var topic="/topics/"+provider+'_'+agenda_id;
		var message = {
    				to: topic,
    				data: {
        				type: 'update',
						entity_type: 'event',
						update_type: update_type,
						update_method: 'events',
						sender_id: sender_id,
						entity_name: event_name
    				}
        };

        //promise style
        fcm.send(message)
    	.then(function(response){})
    	.catch(function(err){
        		console.log("Something has gone wrong!");
        		console.error(err);
		});

	},

	sendNote: function(user_id, provider, agenda_id, event_id, first_name, last_name, profile_picture, content, attachment_type, attachment, access_level, created_at){
							var topic="/topics/"+provider+'_'+agenda_id;
                            //console.log("topic="+topic);
                            var message = { 
                                to: topic, // required fill with device token or topics
                                collapse_key: provider+'_'+agenda_id,
                                data: {
                                    type: 'message',
                                    user_id: user_id,
                                    provider: provider,
                                    agenda_id: agenda_id,
                                    event_id: event_id,
                                    first_name: first_name,
                                    last_name: last_name,
                                    profile_picture: profile_picture,
                                    content: content,
                                    attachment: attachment,
                                    attachment_type: attachment_type,
                                    access_level: access_level,
                                    created_at: created_at
                                }
                            };
                            fcm.send(message)
                            .then(function(response){
                                //console.log("Successfully sent with response: ", response);
                            })
                            .catch(function(err){
                                //console.log("Something has gone wrong!");
                                console.error(err);
                        	});
	}
}
	
