<script setup>
import { useData } from 'vitepress';
import { usePosts } from '@chunge16/vitepress-blogs-theme';
import VPBHomePost from '../../node_modules/@chunge16/vitepress-blogs-theme/src/theme/components/VPBHomePost.vue';

const { posts } = usePosts();
const { theme } = useData();
</script>

<template>
  <section class="vpb-shell mx-auto max-w-screen-2xl px-4 py-8 sm:px-6 lg:px-10 lg:py-16">
    <div class="vpb-page rounded-[2rem] px-6 py-10 sm:px-10 lg:px-16 lg:py-16">
      <div class="vpb-page-header mx-auto max-w-3xl text-center">
        <p class="vpb-kicker">Journal</p>
        <!-- 原 VPB 组件用 h2，缺页级标题；本地副本改 h1（样式类 vpb-display-title 通用，双端通用） -->
        <h1 class="vpb-display-title">
          {{ theme.blog?.title }}
        </h1>
        <p class="vpb-lead">
          {{ theme.blog?.description }}
        </p>
      </div>
      <div class="grid gap-5 xl:grid-cols-2 xl:gap-6">
        <div v-for="post of posts" :key="post.url">
          <VPBHomePost :post="post" />
        </div>
      </div>
    </div>
  </section>
</template>
