import {FastifyPluginAsyncJsonSchemaToTs} from '@fastify/type-provider-json-schema-to-ts';
import {idParamSchema} from '../../utils/reusedSchemas';
import {changeUserBodySchema, createUserBodySchema, subscribeBodySchema,} from './schemas';
import type {UserEntity} from '../../utils/DB/entities/DBUsers';


const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
    fastify
): Promise<void> => {
    fastify.get('/', async function (request, reply): Promise<UserEntity[]> {
        return fastify.db.users.findMany();
    });

    fastify.get(
        '/:id',
        {
            schema: {
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<UserEntity> {
            const {id} = request.params;
            const user = await fastify.db.users.findOne({key: 'id', equals: id});

            if (!user) {
                throw fastify.httpErrors.notFound("User not found!");
            }
            if (!checkIfValidUUID(id)) {
                throw fastify.httpErrors.badRequest("Incorrect user id!");
            }
            return user;
        }
    );

    fastify.post(
        '/',
        {
            schema: {
                body: createUserBodySchema,
            },
        },
        async function (request, reply): Promise<UserEntity> {
            const {
                firstName,
                lastName,
                email
            } = request.body;
            const newUser = {firstName, lastName, email}

            return await fastify.db.users.create(newUser);
        }
    );

    fastify.delete(
        '/:id',
        {
            schema: {
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<UserEntity> {
            const {id} = request.params;
            const profile = await fastify.db.profiles.findOne({key: 'userId', equals: id});
            if (profile) {
                await fastify.db.profiles.delete(profile.id);
            }

            const posts = await fastify.db.posts.findMany({key: 'userId', equals: id});
            if (posts) {
                for (const post of posts) {
                    await fastify.db.posts.delete(post.id);
                }
            }

            const subscribers = await fastify.db.users.findMany({key: "subscribedToUserIds", inArray: id})
            if (subscribers) {
                subscribers.forEach((subscriber) => {
                    const subscriberIndex = subscriber.subscribedToUserIds.findIndex((id) => id === id);
                    if (subscriberIndex === -1) {
                        reply.statusCode = 404;
                        throw new Error("Subscriber not found!");
                    }
                    subscriber.subscribedToUserIds.splice(subscriberIndex, 1);
                    fastify.db.users.change(subscriber.id, {subscribedToUserIds: subscriber.subscribedToUserIds})
                });
            }

            try {
                return await fastify.db.users.delete(id);
            } catch (error) {
                reply.statusCode = 400;
                throw new Error('User not found!');
            }

        }
    );

    fastify.post(
        '/:id/subscribeTo',
        {
            schema: {
                body: subscribeBodySchema,
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<UserEntity> {
            const {id} = request.params;
            const {userId} = request.body;

            const users = await fastify.db.users.findMany({key: 'id', equalsAnyOf: [id, userId]});

            const user = users.find(user => user.id === id);
            const subscriber = users.find(subscriber => subscriber.id === userId);

            if (!user || !subscriber) {
                reply.statusCode = 400;
                throw new Error("Not found!");
            }
            subscriber.subscribedToUserIds.push(id);
            return fastify.db.users.change(subscriber.id, {subscribedToUserIds: subscriber.subscribedToUserIds});
        }
    );

    fastify.post(
        '/:id/unsubscribeFrom',
        {
            schema: {
                body: subscribeBodySchema,
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<UserEntity> {
            const {id} = request.params;
            const {userId} = request.body;

            const users = await fastify.db.users.findMany({key: 'id', equalsAnyOf: [id, userId]});

            const user = users.find(user => user.id === id);
            const subscriber = users.find(subscriber => subscriber.id === userId);

            if (!user || !subscriber) {
                reply.statusCode = 404;
                throw new Error("User not found!");
            }

            const idx = subscriber.subscribedToUserIds.findIndex(subscribeId => subscribeId === user.id);
            if (idx === -1) {
                reply.statusCode = 400;
                throw new Error(`User with id:${id} not found!`);
            }

            subscriber.subscribedToUserIds.splice(idx, 1);

            return fastify.db.users.change(subscriber.id, {subscribedToUserIds: subscriber.subscribedToUserIds});
        }
    );

    fastify.patch(
        '/:id',
        {
            schema: {
                body: changeUserBodySchema,
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<UserEntity> {
            const {id} = request.params;
            if (!checkIfValidUUID(id)) {
                reply.statusCode = 400;
                throw new Error("Incorrect user id!");
            }
            const {firstName, lastName, email} = request.body;

            return await fastify.db.users.change(id, {firstName, lastName, email});
        }
    );
};

function checkIfValidUUID(str: string) {
    const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
    return regexExp.test(str);
}

export default plugin;
