// 原来
if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
  errors.push('请提供有效的手机号码');
}
// 改为
if (!phone || !/^\+?[1-9]\d{6,14}$/.test(phone)) {
  errors.push('请提供有效的手机号码（支持国际格式）');
}
