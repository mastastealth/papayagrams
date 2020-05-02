import Vue from 'vue';
import PubNubVue from 'pubnub-vue';
import App from './App.vue';

Vue.config.productionTip = false;
Vue.use(PubNubVue, {
  publishKey: process.env.VUE_APP_PUBKEY,
  subscribeKey: process.env.VUE_APP_SUBKEY,
  ssl: true,
});

new Vue({
  render: (h) => h(App),
}).$mount('#app');
