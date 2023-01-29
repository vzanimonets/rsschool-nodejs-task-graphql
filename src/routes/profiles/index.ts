import {FastifyPluginAsyncJsonSchemaToTs} from '@fastify/type-provider-json-schema-to-ts';
import {idParamSchema} from '../../utils/reusedSchemas';
import {changeProfileBodySchema, createProfileBodySchema} from './schema';
import type {ProfileEntity} from '../../utils/DB/entities/DBProfiles';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
    fastify
): Promise<void> => {
    fastify.get('/', async function (request, reply): Promise<ProfileEntity[]> {
        return fastify.db.profiles.findMany();
    });

    fastify.get(
        '/:id',
        {
            schema: {
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<ProfileEntity> {
            const {id} = request.params;

            if (!checkIfValidUUID(id)) {
                reply.statusCode = 404;
                throw new Error('Incorrect id');
            }

            const profile = await fastify.db.profiles.findOne({key: 'id', equals: id});

            if (!profile) {
                throw fastify.httpErrors.notFound(`profile with ${id} not found`);
            } else {
                return profile;
            }
        }
    );

    fastify.post(
        '/',
        {
            schema: {
                body: createProfileBodySchema,
            },
        },
        async function (request, reply): Promise<ProfileEntity> {
            const {
                userId,
                avatar,
                birthday,
                city,
                country,
                memberTypeId,
                sex,
                street
            } = request.body;

            if (await fastify.db.profiles.findOne({key: 'userId', equals: userId})) {
                throw fastify.httpErrors.badRequest("Profile has already exist!");
            }

            if (!(await fastify.db.memberTypes.findOne({key: 'id', equals: memberTypeId}))) {
                throw fastify.httpErrors.badRequest('Member Type does not exists');
            }

            const newProfile = {
                userId,
                avatar,
                birthday,
                city,
                country,
                memberTypeId,
                sex,
                street
            };

            return await fastify.db.profiles.create(newProfile);
        }
    );

    fastify.delete(
        '/:id',
        {
            schema: {
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<ProfileEntity> {
            const profile = await fastify.db.profiles.findOne({key: 'id', equals: request.params.id});
            if (!profile) {
                reply.statusCode = 400;
                throw new Error("Not found!");
            }

            return await fastify.db.profiles.delete(profile.id);
        }
    );

    fastify.patch(
        '/:id',
        {
            schema: {
                body: changeProfileBodySchema,
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<ProfileEntity> {
            const {id} = request.params;
            if (!checkIfValidUUID(id)) {
                reply.statusCode = 400;
                throw new Error("Incorrect profile id!");
            }
            const {
                avatar,
                birthday,
                city,
                country,
                memberTypeId,
                sex,
                street
            } = request.body;

            const profile = await fastify.db.profiles.change(id, {
                avatar,
                birthday,
                city,
                country,
                memberTypeId,
                sex,
                street
            });
            return profile;
        }
    );
};

function checkIfValidUUID(str: string) {
    const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
    return regexExp.test(str);
}

export default plugin;
