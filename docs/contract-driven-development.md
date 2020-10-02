# Contract Driven Development

Chuck and Alice are great developers. Alice can write amazing api backends and is great with databases and servers, while Chuck is all about the frontend, and doesn't want to touch backend stuff with a ten foot pole.

Chuck and Alice receive a task - they must implement a new feature that would require a new endpoint in the api.

In fact the feature they are tald to implement is "feature flags". They come together and figure lets just have a "feature" endpint and go from there:

```
$ curl -H 'Content-Type: application/json' https://api.example.com/v1/feature/my-new-feature
> { active: true }
```

Alice puts on her headphones, disables her notifications and starts cranking out this feature. Chuck _could_ start working on his bit, but since he doesn't want to make it awkward for himself, he lets her finish that endpoint so its easier to actually build it with a working API. He'd better work on that landing page animation in the meantime.

Next day Alice is done and deploys it to a staging environment. Great. Chuck takes the whole day to finish that animation though, since he wants to make it extra smooth. No worries, he'll start tomorrow.

Ok Chuck is now ready to go for it, while he's working he realises they need to change the api. You see the feature flag must work on a user based principle, not just globally. Obviously. Alice has started on that other bug yesterday though and still hasn't finished. And she has told Chuck a million times now that switching contexts is bad for everyone's health. So now Chuck either needs to wait, be an ashole or start working on something else.

Since the title of this is "Contract Driver Development" you might have an incling where things are headed. If we had a standard, verifiable way to express our API, both Chuck and Alice can hash out a prototype definition and start working on it from both ends simulteniously. When they discover they need changes, they can communicate and resolve it, but since both of them are already working on the same task it becomes a lot simpler to fix any of their initial asumptions.

This is also a lot more scalable. We can replace Chuck and Alice with whole teams. Coordinating changes to apis for microservices becomes a lot more straightforward. Good contracts for apis are tools like GraphQL and OpenAPI, that have a lot of nice tooling around them to build mock apis, write tests, validates inputs / outpus and generate Types.
