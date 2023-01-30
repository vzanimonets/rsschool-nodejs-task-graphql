import {FastifyPluginAsyncJsonSchemaToTs} from '@fastify/type-provider-json-schema-to-ts';
import {idParamSchema} from '../../utils/reusedSchemas';
import {changePostBodySchema, createPostBodySchema} from './schema';
import type {PostEntity} from '../../utils/DB/entities/DBPosts';

const plugin: FastifyPluginAsyncJsonSchemaToTs = async (
    fastify
): Promise<void> => {
    fastify.get('/', async function (request, reply): Promise<PostEntity[]> {
        const posts = fastify.db.posts.findMany();
        return posts
    });

    fastify.get(
        '/:id',
        {
            schema: {
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<PostEntity> {
            const {id} = request.params;

            if (!checkIfValidUUID(id)) {
                reply.statusCode = 404;
                throw new Error('incorrect id');
            }

            const post = await fastify.db.posts.findOne({key: 'id', equals: id});

            if (!post) {
                reply.statusCode = 404;
                throw new Error(`Post with ${id} not found`);
            } else {
                return post;
            }
        }
    );

    fastify.post(
        '/',
        {
            schema: {
                body: createPostBodySchema,
            },
        },
        async function (request, reply): Promise<PostEntity> {
            const {
                userId,
                content,
                title
            } = request.body;
            const newPost = {userId, content, title}

            return await fastify.db.posts.create(newPost);
        }
    );

    fastify.delete(
        '/:id',
        {
            schema: {
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<PostEntity> {
            const post = await fastify.db.posts.findOne({key: 'id', equals: request.params.id});
            if (!post) {
                reply.statusCode = 400;
                throw new Error("Post not found!");
            }
            return await fastify.db.posts.delete(post.id);
        }
    );

    fastify.patch(
        '/:id',
        {
            schema: {
                body: changePostBodySchema,
                params: idParamSchema,
            },
        },
        async function (request, reply): Promise<PostEntity> {
            const {id} = request.params;
            if (!checkIfValidUUID(id)) {
                reply.statusCode = 400;
                throw new Error("Incorrect post id!");
            }

            const {title, content} = request.body;
            return await fastify.db.posts.change(id, {title, content});
        }
    );
};

function checkIfValidUUID(str: string) {
    const regexExp = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/gi;
    return regexExp.test(str);
}

export default plugin;
