import "server-only";

import type { ContentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ARTICLE_CATEGORIES } from "@/lib/article-constants";
import { slugify } from "@/lib/slug";

export { ARTICLE_CATEGORIES } from "@/lib/article-constants";

export interface ArticleInput {
  title: string;
  slug?: string;
  excerpt?: string | null;
  body: string;
  categories?: string[];
  featuredImageUrl?: string | null;
  status: ContentStatus;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
}

async function uniqueSlug(base: string, excludeId?: string) {
  const candidate = slugify(base) || "artigo";
  let suffix = 0;

  while (true) {
    const slug = suffix === 0 ? candidate : `${candidate}-${suffix}`;
    const existing = await prisma.article.findUnique({ where: { slug } });
    if (!existing || existing.id === excludeId) return slug;
    suffix += 1;
  }
}

export async function listPublishedArticles() {
  return prisma.article.findMany({
    where: { status: "published" },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: {
      author: {
        include: { person: true },
      },
    },
  });
}

export async function getPublishedArticleBySlug(slug: string) {
  return prisma.article.findFirst({
    where: { slug, status: "published" },
    include: {
      author: {
        include: { person: true },
      },
    },
  });
}

export async function listArticlesForStaff() {
  return prisma.article.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: {
      author: {
        include: { person: true },
      },
    },
  });
}

export async function createArticle(authorId: string | null, input: ArticleInput) {
  const slug = await uniqueSlug(input.slug || input.title);
  const publishedAt = input.status === "published" ? new Date() : null;

  return prisma.article.create({
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt || null,
      body: input.body,
      categories: input.categories ?? [],
      featuredImageUrl: input.featuredImageUrl || null,
      status: input.status,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      seoKeywords: input.seoKeywords || null,
      publishedAt,
      authorId,
    },
  });
}

export async function updateArticle(id: string, input: ArticleInput) {
  const current = await prisma.article.findUnique({ where: { id } });
  if (!current) return null;

  const slug = input.slug ? await uniqueSlug(input.slug, id) : current.slug;

  const publishedAt =
    input.status === "published"
      ? current.publishedAt ?? new Date()
      : input.status === "draft"
        ? null
        : current.publishedAt;

  return prisma.article.update({
    where: { id },
    data: {
      title: input.title,
      slug,
      excerpt: input.excerpt || null,
      body: input.body,
      categories: input.categories ?? [],
      featuredImageUrl: input.featuredImageUrl || null,
      status: input.status,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      seoKeywords: input.seoKeywords || null,
      publishedAt,
    },
  });
}

export async function deleteArticle(id: string) {
  return prisma.article.delete({ where: { id } });
}
