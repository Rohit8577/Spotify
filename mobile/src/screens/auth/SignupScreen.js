import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '../../components/Icon';
import { colors } from '../../theme/colors';
import { useAuth } from '../../context/AuthContext';
import { authApi } from '../../api/authApi';
import { Alert } from '../../utils/alert';

export const SignupScreen = ({ navigation }) => {
  const { signup } = useAuth();

  const [step, setStep] = useState(1); // 1: Email & OTP, 2: Profile details & Password

  // Step 1 state
  const [email, setEmail] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [verificationToken, setVerificationToken] = useState(null);
  const [otpSent, setOtpSent] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);

  // Step 2 state
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [gender, setGender] = useState('Male');
  const [dob, setDob] = useState('2000-01-01');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setCheckingEmail(true);
    try {
      // 1. Check if email already registered
      await authApi.checkEmail(email.trim());

      // 2. Request OTP
      const res = await authApi.sendOtp(email.trim());
      if (res.success) {
        setVerificationToken(null);
        setOtpSent(true);
        Alert.alert('OTP Sent', `A 4-digit verification code was sent to ${email.trim()}.`);
      } else {
        throw new Error('Could not send verification code');
      }
    } catch (err) {
      const msg = err.response?.data?.msg || err.response?.data?.message || err.response?.data?.error || 'Email check failed.';
      Alert.alert('Notice', msg);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) {
      Alert.alert('Enter OTP', 'Please enter the 4-digit code.');
      return;
    }

    setCheckingEmail(true);
    try {
      const result = await authApi.verifyOtp(email.trim(), otpInput.trim());
      setVerificationToken(result.verificationToken);
      setStep(2);
    } catch (error) { Alert.alert('Invalid OTP', error.response?.data?.message || 'Verification failed.'); }
    finally { setCheckingEmail(false); }
  };

  const handleCompleteSignup = async () => {
    if (!name.trim()) {
      Alert.alert('Name Required', 'Please enter your name.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setSubmitting(true);
    try {
      await signup(
        email.trim(),
        {
          name: name.trim(),
          gender,
          dob: new Date(dob),
        },
        password,
        verificationToken
      );
    } catch (err) {
      const msg = err.response?.data?.message || 'Signup failed, please try again.';
      Alert.alert('Signup Error', msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Back button */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => (step === 2 ? setStep(1) : navigation.goBack())}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              {step === 1 ? 'Step 1 of 2: Verify your email' : 'Step 2 of 2: Complete your profile'}
            </Text>
          </View>

          {step === 1 ? (
            <View style={styles.form}>
              <Text style={styles.label}>What is your email?</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="mail-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter email"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!otpSent}
                />
              </View>

              {!otpSent ? (
                <TouchableOpacity
                  style={[styles.actionBtn, checkingEmail && styles.btnDisabled]}
                  onPress={handleSendOtp}
                  disabled={checkingEmail}
                >
                  {checkingEmail ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.actionBtnText}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <>
                  <Text style={[styles.label, { marginTop: 16 }]}>Enter 4-Digit Code</Text>
                  <View style={styles.inputContainer}>
                    <Ionicons name="key-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="1234"
                      placeholderTextColor={colors.textSecondary}
                      value={otpInput}
                      onChangeText={setOtpInput}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>

                  <TouchableOpacity style={styles.actionBtn} onPress={handleVerifyOtp} disabled={checkingEmail}>
                    <Text style={styles.actionBtnText}>Verify Code & Continue</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.resendBtn}
                    onPress={handleSendOtp}
                    disabled={checkingEmail}
                  >
                    <Text style={styles.resendText}>Resend Code</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>What should we call you?</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="person-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Your Name"
                  placeholderTextColor={colors.textSecondary}
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>Create a Password</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="At least 6 characters"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <Text style={[styles.label, { marginTop: 12 }]}>Gender</Text>
              <View style={styles.genderRow}>
                {['Male', 'Female', 'Non-binary'].map((g) => {
                  const isSelected = gender === g;
                  return (
                    <TouchableOpacity
                      key={g}
                      style={[styles.genderChip, isSelected && styles.genderChipSelected]}
                      onPress={() => setGender(g)}
                    >
                      <Text style={[styles.genderText, isSelected && styles.genderTextSelected]}>
                        {g}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { marginTop: 16 }]}>Date of Birth (YYYY-MM-DD)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="2000-01-01"
                  placeholderTextColor={colors.textSecondary}
                  value={dob}
                  onChangeText={setDob}
                />
              </View>

              <TouchableOpacity
                style={[styles.actionBtn, submitting && styles.btnDisabled, { marginTop: 24 }]}
                onPress={handleCompleteSignup}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.actionBtnText}>Finish & Start Listening</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backBtn: {
    marginTop: 12,
    marginBottom: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  header: {
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 6,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
  },
  actionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  actionBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
  resendBtn: {
    alignSelf: 'center',
    marginTop: 16,
    padding: 8,
  },
  resendText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  genderChip: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  genderChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  genderText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  genderTextSelected: {
    color: '#000',
    fontWeight: '700',
  },
});
