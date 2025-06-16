import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../../../../components/ui/Button';

type LandingButtonVariant = 'primary' | 'secondary' | 'outline';
type LandingButtonSize = 'sm' | 'md' | 'lg';

interface BaseLandingButtonProps {
  title: string;
  variant?: LandingButtonVariant;
  size?: LandingButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: React.CSSProperties;
}

interface ButtonLandingButtonProps extends BaseLandingButtonProps {
  onPress: () => void;
  as?: 'button';
}

interface LinkLandingButtonProps extends BaseLandingButtonProps {
  as: typeof Link;
  to: string;
}

interface AnchorLandingButtonProps extends BaseLandingButtonProps {
  as: 'a';
  href: string;
}

type LandingButtonProps = ButtonLandingButtonProps | LinkLandingButtonProps | AnchorLandingButtonProps;

const getLandingButtonStyle = (
  variant: LandingButtonVariant, 
  size: LandingButtonSize,
  disabled: boolean
): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    borderRadius: 'var(--radius-md)',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: 'var(--transition-normal)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: 'none',
    fontFamily: 'var(--font-family-text)',
    textDecoration: 'none',
    textTransform: 'none',
    letterSpacing: '0'
  };

  const sizeStyles = {
    sm: {
      padding: 'var(--space-sm) var(--space-lg)',
      fontSize: 'var(--text-sm)',
      height: '32px'
    },
    md: {
      padding: 'var(--space-md) var(--space-xl)',
      fontSize: 'var(--text-base)',
      height: '40px'
    },
    lg: {
      padding: 'var(--space-lg) var(--space-2xl)',
      fontSize: 'var(--text-lg)',
      height: '48px'
    }
  };

  const variantStyles = {
    primary: {
      background: 'var(--primary-green)',
      color: 'var(--text-inverse)',
      border: '1px solid var(--primary-green)'
    },
    secondary: {
      background: 'var(--bg-secondary)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-primary)'
    },
    outline: {
      background: 'transparent',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-primary)'
    }
  };

  return {
    ...baseStyles,
    ...sizeStyles[size],
    ...variantStyles[variant]
  };
};

const getHoverStyles = (variant: LandingButtonVariant, disabled: boolean) => {
  if (disabled) return {};
  
  if (variant === 'primary') {
    return { background: 'var(--primary-green-dark)' };
  } else if (variant === 'outline') {
    return { 
      borderColor: 'var(--primary-green)',
      color: 'var(--primary-green)' 
    };
  } else {
    return { background: 'var(--bg-tertiary)' };
  }
};

const getDefaultStyles = (variant: LandingButtonVariant) => {
  if (variant === 'primary') {
    return { background: 'var(--primary-green)' };
  } else if (variant === 'outline') {
    return { 
      borderColor: 'var(--border-primary)',
      color: 'var(--text-primary)' 
    };
  } else {
    return { background: 'var(--bg-secondary)' };
  }
};

export const LandingButton: React.FC<LandingButtonProps> = (props) => {
  const {
    title,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    style = {},
    ...rest
  } = props;

  const buttonStyle = getLandingButtonStyle(variant, size, disabled);
  const finalStyle = {
    ...buttonStyle,
    ...(fullWidth && { width: '100%' }),
    ...style
  };

  const commonProps = {
    style: finalStyle,
    disabled: disabled || loading,
    onMouseEnter: (e: React.MouseEvent<HTMLElement>) => {
      if (!disabled) {
        Object.assign(e.currentTarget.style, getHoverStyles(variant, disabled));
      }
    },
    onMouseLeave: (e: React.MouseEvent<HTMLElement>) => {
      if (!disabled) {
        Object.assign(e.currentTarget.style, getDefaultStyles(variant));
      }
    }
  };

  if ('as' in props && props.as === Link) {
    return (
      <Link
        {...commonProps}
        to={props.to}
      >
        {loading ? '...' : title}
      </Link>
    );
  }

  if ('as' in props && props.as === 'a') {
    return (
      <a
        {...commonProps}
        href={props.href}
      >
        {loading ? '...' : title}
      </a>
    );
  }

  // Default button behavior
  const buttonProps = props as ButtonLandingButtonProps;
  return (
    <button
      {...commonProps}
      onClick={buttonProps.onPress}
    >
      {loading ? '...' : title}
    </button>
  );
}; 