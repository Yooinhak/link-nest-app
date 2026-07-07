import React, { Component, ErrorInfo, ReactNode } from 'react';

import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors } from '../constants/theme';
import { Sentry } from '../utils/sentry';

import { AlertTriangleIcon } from './icons';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

const AlertIcon = () => <AlertTriangleIcon size={48} color={colors.danger} strokeWidth={1.5} />;

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    Sentry.captureException(error, {
      extra: { componentStack: errorInfo.componentStack },
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <AlertIcon />
          <Text style={styles.title}>문제가 발생했어요</Text>
          <Text style={styles.description}>
            예상치 못한 오류가 발생했습니다.{'\n'}아래 버튼을 눌러 다시 시도해주세요.
          </Text>
          <TouchableOpacity style={styles.button} onPress={this.handleRetry} activeOpacity={0.7}>
            <Text style={styles.buttonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
    lineHeight: 20,
  },
  button: {
    marginTop: 12,
    backgroundColor: colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.white,
  },
});
