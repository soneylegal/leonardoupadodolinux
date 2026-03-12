/**
 * Componentes reutilizáveis
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Props types
interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'outline';
  size?: 'small' | 'medium' | 'large';
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
}

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
}

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  theme: any;
}

interface MetricCardProps {
  label: string;
  value: string | number;
  color?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  theme: any;
}

// Button Component
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  icon,
  style,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return '#666';
    switch (variant) {
      case 'primary': return '#4f83f8';
      case 'secondary': return '#374151';
      case 'success': return '#34d399';
      case 'danger': return '#f87171';
      case 'outline': return 'transparent';
      default: return '#4f83f8';
    }
  };

  const getPadding = () => {
    switch (size) {
      case 'small': return { paddingVertical: 8, paddingHorizontal: 16 };
      case 'medium': return { paddingVertical: 12, paddingHorizontal: 24 };
      case 'large': return { paddingVertical: 16, paddingHorizontal: 32 };
      default: return { paddingVertical: 12, paddingHorizontal: 24 };
    }
  };

  const buttonStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    ...getPadding(),
    ...(variant === 'outline' && { borderWidth: 1, borderColor: '#4f83f8' }),
    ...style,
  };

  const textColor = variant === 'outline' ? '#4f83f8' : '#fff';

  return (
    <TouchableOpacity
      style={buttonStyle}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={20} color={textColor} />}
          <Text style={{ color: textColor, fontSize: 16, fontWeight: '600' }}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

// Card Component
export const Card: React.FC<CardProps> = ({ children, style, onPress }) => {
  const cardStyle: ViewStyle = {
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    padding: 16,
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity style={cardStyle} onPress={onPress} activeOpacity={0.8}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyle}>{children}</View>;
};

// Header Component
export const Header: React.FC<HeaderProps> = ({
  title,
  showBack = false,
  onBack,
  rightAction,
  theme,
}) => {
  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.left}>
        {showBack && (
          <TouchableOpacity onPress={onBack} style={headerStyles.backButton}>
            <Ionicons name="chevron-back" size={24} color={theme.primary} />
            <Text style={[headerStyles.backText, { color: theme.primary }]}>
              Back
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[headerStyles.title, { color: theme.text }]}>{title}</Text>
      <View style={headerStyles.right}>{rightAction}</View>
    </View>
  );
};

const headerStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  left: {
    width: 80,
  },
  right: {
    width: 80,
    alignItems: 'flex-end',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    fontSize: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    flex: 1,
  },
});

// Metric Card Component
export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  color,
  icon,
  theme,
}) => {
  return (
    <View style={metricStyles.container}>
      {icon && (
        <Ionicons
          name={icon}
          size={24}
          color={color || theme.text}
          style={metricStyles.icon}
        />
      )}
      <Text style={[metricStyles.label, { color: theme.textSecondary }]}>
        {label}
      </Text>
      <Text style={[metricStyles.value, { color: color || theme.text }]}>
        {value}
      </Text>
    </View>
  );
};

const metricStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: 10,
    minWidth: 80,
  },
  icon: {
    marginBottom: 5,
  },
  label: {
    fontSize: 12,
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});

// Status Badge Component
interface StatusBadgeProps {
  status: 'running' | 'stopped' | 'error' | 'warning';
  text?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, text }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'running': return '#34d399';
      case 'stopped': return '#4b5563';
      case 'error': return '#f87171';
      case 'warning': return '#f59e0b';
      default: return '#4b5563';
    }
  };

  return (
    <View style={[badgeStyles.container, { backgroundColor: getStatusColor() }]}>
      <Text style={badgeStyles.text}>{text || status}</Text>
    </View>
  );
};

const badgeStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  text: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

// Empty State Component
interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  action?: {
    label: string;
    onPress: () => void;
  };
  theme: any;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  theme,
}) => {
  return (
    <View style={emptyStyles.container}>
      <Ionicons name={icon} size={64} color={theme.textSecondary} />
      <Text style={[emptyStyles.title, { color: theme.text }]}>{title}</Text>
      {description && (
        <Text style={[emptyStyles.description, { color: theme.textSecondary }]}>
          {description}
        </Text>
      )}
      {action && (
        <Button
          title={action.label}
          onPress={action.onPress}
          variant="primary"
          size="small"
          style={{ marginTop: 20 }}
        />
      )}
    </View>
  );
};

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});
