import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { preloadRoute } from '@/router/routePrefetch';

const withPrefetchHandlers = (to, handlers = {}) => {
    const { onMouseEnter, onFocus, onTouchStart, ...rest } = handlers;

    const triggerPrefetch = () => {
        void preloadRoute(to);
    };

    return {
        ...rest,
        onMouseEnter: (event) => {
            onMouseEnter?.(event);
            if (!event.defaultPrevented) triggerPrefetch();
        },
        onFocus: (event) => {
            onFocus?.(event);
            if (!event.defaultPrevented) triggerPrefetch();
        },
        onTouchStart: (event) => {
            onTouchStart?.(event);
            if (!event.defaultPrevented) triggerPrefetch();
        },
    };
};

export const PrefetchLink = React.forwardRef(({ to, ...props }, ref) => (
    <Link ref={ref} to={to} {...withPrefetchHandlers(to, props)} />
));

PrefetchLink.displayName = 'PrefetchLink';

export const PrefetchNavLink = React.forwardRef(({ to, ...props }, ref) => (
    <NavLink ref={ref} to={to} {...withPrefetchHandlers(to, props)} />
));

PrefetchNavLink.displayName = 'PrefetchNavLink';
