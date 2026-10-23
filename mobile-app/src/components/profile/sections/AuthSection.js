import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { colors } from '../../../constants/theme';
import styles from '../styles/profileStyles';

/**
 * Khối giao diện Xác thực: Đăng nhập, Đăng ký, Xác minh OTP, Quên mật khẩu & Đăng nhập Google
 */
export default function AuthSection({
  authMode,
  setAuthMode,
  email,
  setEmail,
  password,
  setPassword,
  displayName,
  setDisplayName,
  confirmPassword,
  setConfirmPassword,
  showPassword,
  setShowPassword,
  loading = false,
  errorMessage = '',
  successMessage = '',
  busyGoogle = false,
  otp,
  setOtp,
  forgotStep,
  setForgotStep,
  newPassword,
  setNewPassword,
  confirmNewPassword,
  setConfirmNewPassword,
  showNewPassword,
  setShowNewPassword,
  onLogin,
  onRegister,
  onVerifyOtp,
  onResendOtp,
  onSendForgotOtp,
  onVerifyResetOtp,
  onResetPasswordOtp,
  onGoogleAuth,
  allowSkip = true,
  onSkip,
}) {
  return (
    <View style={styles.authContainer}>
      {/* Header Form */}
      <View style={styles.authHeader}>
        <View style={styles.authIconWrap}>
          <Text style={styles.authIcon}>
            {authMode === 'verify_otp'
              ? '✉️'
              : authMode === 'forgot_password'
              ? forgotStep === 3
                ? '🔒'
                : forgotStep === 2
                ? '✉️'
                : '🔑'
              : '🎓'}
          </Text>
        </View>
        <Text style={styles.authTitle}>
          {authMode === 'login'
            ? 'ĐĂNG NHẬP HỆ THỐNG'
            : authMode === 'register'
            ? 'ĐĂNG KÝ TÀI KHOẢN'
            : authMode === 'verify_otp'
            ? 'XÁC MINH MÃ OTP'
            : forgotStep === 1
            ? 'QUÊN MẬT KHẨU'
            : forgotStep === 2
            ? 'XÁC THỰC MÃ OTP'
            : 'TẠO MẬT KHẨU MỚI'}
        </Text>
        <Text style={styles.authHint}>
          {authMode === 'login'
            ? 'Đăng nhập để đồng bộ bài giảng, phụ đề và câu hỏi ôn tập trên mọi thiết bị.'
            : authMode === 'register'
            ? 'Tạo tài khoản học viên để tự do quản lý bài giảng và tạo bài thi trắc nghiệm.'
            : authMode === 'verify_otp'
            ? `Mã OTP 6 số đã được gửi tới email ${email}. Vui lòng nhập mã để kích hoạt tài khoản.`
            : forgotStep === 1
            ? 'Nhập địa chỉ email tài khoản của bạn để nhận mã OTP đặt lại mật khẩu.'
            : forgotStep === 2
            ? `Mã OTP đã được gửi tới ${email}. Nhập mã 6 số để xác thực danh tính.`
            : `Xác thực thành công! Nhập mật khẩu mới cho tài khoản ${email}.`}
        </Text>
      </View>

      {/* Bộ chuyển đổi Tab: Đăng nhập / Đăng ký */}
      {(authMode === 'login' || authMode === 'register') && (
        <View style={styles.tabSwitcher}>
          <TouchableOpacity
            style={[styles.tabBtn, authMode === 'login' && styles.tabBtnActive]}
            onPress={() => setAuthMode('login')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, authMode === 'login' && styles.tabBtnTextActive]}>
              🔑 Đăng nhập
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, authMode === 'register' && styles.tabBtnActive]}
            onPress={() => setAuthMode('register')}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, authMode === 'register' && styles.tabBtnTextActive]}>
              ✨ Đăng ký
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Thông báo Lỗi / Thành công */}
      {errorMessage ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {errorMessage}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>✓ {successMessage}</Text>
        </View>
      ) : null}

      {/* Chế độ 1: Đăng nhập & Đăng ký thông thường */}
      {(authMode === 'login' || authMode === 'register') && (
        <View style={styles.formGroup}>
          {authMode === 'register' ? (
            <>
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>TÊN ĐĂNG NHẬP</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>👤</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ví dụ: nguyenvana"
                    placeholderTextColor={colors.textMuted}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>ĐỊA CHỈ EMAIL</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="email@example.com"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>
            </>
          ) : (
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>TÊN ĐĂNG NHẬP HOẶC EMAIL</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>👤</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập tên đăng nhập hoặc email"
                  placeholderTextColor={colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
          )}

          <View style={styles.inputField}>
            <Text style={styles.inputLabel}>MẬT KHẨU</Text>
            <View style={styles.inputWrap}>
              <Text style={styles.inputIcon}>🔒</Text>
              <TextInput
                style={styles.textInput}
                placeholder="Tối thiểu 8 ký tự"
                placeholderTextColor={colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '🙈'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {authMode === 'login' && (
            <TouchableOpacity
              style={{ alignSelf: 'flex-end', marginTop: 2, marginBottom: 8 }}
              onPress={() => {
                setAuthMode('forgot_password');
                setForgotStep(1);
              }}
              activeOpacity={0.7}
            >
              <Text style={{ color: colors.primaryLight, fontSize: 12, fontWeight: '600' }}>
                Quên mật khẩu?
              </Text>
            </TouchableOpacity>
          )}

          {authMode === 'register' && (
            <View style={styles.inputField}>
              <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU</Text>
              <View style={styles.inputWrap}>
                <Text style={styles.inputIcon}>🔐</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Nhập lại mật khẩu"
                  placeholderTextColor={colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                />
              </View>
            </View>
          )}

          {/* Nút Thực hiện chính */}
          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={authMode === 'login' ? onLogin : onRegister}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>
                {authMode === 'login' ? 'Đăng nhập ngay' : 'Tạo tài khoản mới'}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Chế độ 2: Xác minh OTP (Verify OTP) */}
      {authMode === 'verify_otp' && (
        <View style={styles.formGroup}>
          <View style={styles.inputField}>
            <Text style={[styles.inputLabel, { textAlign: 'center', marginBottom: 6 }]}>
              MÃ XÁC MINH OTP (6 CHỮ SỐ)
            </Text>
            <View style={styles.otpInputBox}>
              <TextInput
                style={styles.otpTextInput}
                placeholder="• • • • • •"
                placeholderTextColor="rgba(255, 255, 255, 0.2)"
                value={otp}
                onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
            onPress={onVerifyOtp}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Xác nhận kích hoạt tài khoản</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignSelf: 'center', marginTop: 14, padding: 6 }}
            onPress={onResendOtp}
            disabled={loading}
          >
            <Text style={{ color: colors.primaryLight, fontSize: 13, fontWeight: '700' }}>
              🔄 Chưa nhận được mã? Gửi lại OTP
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ alignSelf: 'center', marginTop: 8, padding: 6 }}
            onPress={() => setAuthMode('login')}
          >
            <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
              ‹ Quay lại Đăng nhập
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Chế độ 3: Quên mật khẩu (Forgot Password qua OTP tách bước) */}
      {authMode === 'forgot_password' && (
        <View style={styles.formGroup}>
          {/* Thanh chỉ báo tiến trình 3 bước */}
          <View style={styles.stepIndicatorRow}>
            <View style={[styles.stepDot, styles.stepDotActive]}>
              <Text style={styles.stepDotText}>1</Text>
            </View>
            <View style={[styles.stepLine, forgotStep >= 2 && styles.stepLineActive]} />
            <View style={[styles.stepDot, forgotStep >= 2 ? styles.stepDotActive : styles.stepDotInactive]}>
              <Text style={[styles.stepDotText, forgotStep < 2 && styles.stepDotTextInactive]}>2</Text>
            </View>
            <View style={[styles.stepLine, forgotStep >= 3 && styles.stepLineActive]} />
            <View style={[styles.stepDot, forgotStep >= 3 ? styles.stepDotActive : styles.stepDotInactive]}>
              <Text style={[styles.stepDotText, forgotStep < 3 && styles.stepDotTextInactive]}>3</Text>
            </View>
          </View>

          {forgotStep === 1 && (
            <>
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>ĐỊA CHỈ EMAIL TÀI KHOẢN</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập email tài khoản của bạn"
                    placeholderTextColor={colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={onSendForgotOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Gửi mã OTP qua Email</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {forgotStep === 2 && (
            <>
              <View style={styles.inputField}>
                <Text style={[styles.inputLabel, { textAlign: 'center', marginBottom: 6 }]}>
                  MÃ OTP TỪ EMAIL (6 SỐ)
                </Text>
                <View style={styles.otpInputBox}>
                  <TextInput
                    style={styles.otpTextInput}
                    placeholder="• • • • • •"
                    placeholderTextColor="rgba(255, 255, 255, 0.2)"
                    value={otp}
                    onChangeText={(val) => setOtp(val.replace(/[^0-9]/g, ''))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoFocus
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={onVerifyResetOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>Xác nhận mã OTP ›</Text>
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                <TouchableOpacity
                  onPress={() => setForgotStep(1)}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
                    ‹ Đổi email khác
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onSendForgotOtp}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: colors.primaryLight, fontSize: 12.5, fontWeight: '700' }}>
                    Gửi lại mã OTP
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {forgotStep === 3 && (
            <>
              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>MẬT KHẨU MỚI</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>✨</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Tối thiểu 8 ký tự"
                    placeholderTextColor={colors.textMuted}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(!showNewPassword)}
                    style={styles.eyeBtn}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.eyeIcon}>{showNewPassword ? '👁️' : '🙈'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputField}>
                <Text style={styles.inputLabel}>XÁC NHẬN MẬT KHẨU MỚI</Text>
                <View style={styles.inputWrap}>
                  <Text style={styles.inputIcon}>🔐</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Nhập lại mật khẩu mới"
                    placeholderTextColor={colors.textMuted}
                    value={confirmNewPassword}
                    onChangeText={setConfirmNewPassword}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={onResetPasswordOtp}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.submitBtnText}>✓ Lưu mật khẩu mới</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={{ alignSelf: 'center', marginTop: 8 }}
                onPress={() => setForgotStep(2)}
                activeOpacity={0.7}
              >
                <Text style={{ color: colors.textMuted, fontSize: 12.5 }}>
                  ‹ Nhập lại mã OTP khác
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={{ alignSelf: 'center', marginTop: 14, padding: 6 }}
            onPress={() => {
              setAuthMode('login');
              setForgotStep(1);
            }}
          >
            <Text style={{ color: colors.textMuted, fontSize: 13 }}>
              ‹ Quay lại Đăng nhập
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Đường phân cách và Google Login */}
      {(authMode === 'login' || authMode === 'register') && (
        <>
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>HOẶC ĐĂNG NHẬP NHANH</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Đăng nhập bằng Google */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={onGoogleAuth}
            disabled={busyGoogle}
            activeOpacity={0.85}
          >
            {busyGoogle ? (
              <ActivityIndicator color="#1f2937" size="small" />
            ) : (
              <View style={styles.googleBtnContent}>
                <View style={styles.googleLogoBox}>
                  <Text style={styles.googleLogoLetter}>G</Text>
                </View>
                <Text style={styles.googleBtnText}>Tiếp tục với Google</Text>
              </View>
            )}
          </TouchableOpacity>
        </>
      )}

      {/* Footer chuyển đổi chế độ */}
      <View style={styles.authFooter}>
        {authMode === 'login' ? (
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Chưa có tài khoản?</Text>
            <TouchableOpacity onPress={() => setAuthMode('register')}>
              <Text style={styles.footerLink}> Đăng ký tài khoản ngay</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Đã có tài khoản?</Text>
            <TouchableOpacity onPress={() => setAuthMode('login')}>
              <Text style={styles.footerLink}> Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Nút bỏ qua / Khám phá không cần đăng nhập */}
      {allowSkip && onSkip && (
        <TouchableOpacity
          style={styles.skipBtn}
          onPress={onSkip}
          activeOpacity={0.8}
        >
          <Text style={styles.skipBtnText}>Bỏ qua & Khám phá ứng dụng (Offline) ›</Text>
        </TouchableOpacity>
      )}

      {/* Huy hiệu cam kết bảo mật */}
      <View style={styles.securityBadgeRow}>
        <Text style={styles.securityBadgeText}>
          🛡️ Mật khẩu được mã hóa an toàn • Phiên đăng nhập JWT bảo mật 100%
        </Text>
      </View>
    </View>
  );
}
