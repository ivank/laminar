JWT=`curl --silent --request POST 'http://localhost:3333/session' --header 'Content-Type: application/json' --data '{"email":"test@example.com","scopes":["admin"]}' | jq '.jwt' -r`
curl --request POST --header "Authorization: Bearer ${JWT}" http://localhost:3333/test
