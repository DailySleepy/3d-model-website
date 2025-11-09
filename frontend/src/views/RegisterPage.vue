<template>
  <div class="flex items-center justify-center min-h-screen bg-gray-50">
    <!-- 注册表单 -->
    <div class="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
      <!-- Logo部分 -->
      <div class="flex justify-center mb-4">
        <router-link to="/home" class="flex items-center space-x-2 text-blue-600">
          <span class="text-xl font-semibold">3D Model Website</span>
        </router-link>
      </div>

      <!-- 表单部分 -->
      <h2 class="text-2xl font-bold text-center mb-6">注册</h2>
      <form @submit.prevent="handleRegister">
        <!-- 用户名输入框 -->
        <div class="mb-4">
          <input type="text" id="username" v-model="username" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入用户名" required />
        </div>

        <!-- 邮箱输入框 -->
        <div class="mb-4">
          <input type="email" id="email" v-model="email" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入邮箱" required />
        </div>

        <!-- 验证码输入框 -->
        <div class="mb-4 flex items-center">
          <input type="text" id="verificationCode" v-model="verificationCode" class="w-2/3 p-3 border rounded-lg focus:outline-none" placeholder="请输入验证码" required />
          <button type="button" class="ml-2 text-white bg-blue-600 rounded-lg px-4 py-2" @click="sendVerificationCode">发送验证码</button>
        </div>

        <!-- 密码输入框 -->
        <div class="mb-6">
          <input type="password" id="password" v-model="password" class="w-full p-3 border rounded-lg focus:outline-none" placeholder="请输入密码" required />
        </div>

        <!-- 注册按钮 -->
        <button type="submit" :disabled="!agreeTerms" class="w-full py-3 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
          注册
        </button>
      </form>

      <div class="mt-4 text-center">
        <span class="text-sm text-gray-600">已有账户？</span>
        <router-link to="/login" class="text-sm text-blue-600">登录账户</router-link>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      username: '',           // 用户名
      email: '',              // 邮箱
      verificationCode: '',   // 验证码
      password: '',           // 密码
    };
  },
  methods: {
    // 模拟发送验证码的功能
    sendVerificationCode() {
      console.log(`验证码发送到邮箱：${this.email}`);
      alert('验证码已发送');
    },

    // 注册处理函数
    handleRegister() {
      if (this.agreeTerms) {
        // 在这里可以进行实际的注册API调用
        console.log('注册信息：', this.username, this.email, this.verificationCode, this.password);
        this.$router.push('/home'); // 注册成功后跳转到主页
      } else {
        alert('请同意用户协议');
      }
    },
  }
};
</script>

