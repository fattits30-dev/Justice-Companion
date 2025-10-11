/// <reference types="react" />

// React 19 compatibility: Re-export JSX namespace globally
declare global {
  namespace JSX {
    // Re-export all JSX types from React namespace
    type Element = React.JSX.Element;
    type ElementType = React.JSX.ElementType;
    type ElementClass = React.JSX.ElementClass;
    type ElementAttributesProperty = React.JSX.ElementAttributesProperty;
    type ElementChildrenAttribute = React.JSX.ElementChildrenAttribute;
    type IntrinsicAttributes = React.JSX.IntrinsicAttributes;
    type IntrinsicClassAttributes<T> = React.JSX.IntrinsicClassAttributes<T>;
    type IntrinsicElements = React.JSX.IntrinsicElements;
  }
}

export {};
