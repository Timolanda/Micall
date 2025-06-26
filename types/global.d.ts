declare module '*.json' {
  const value: any;
  export default value;
}

declare module 'socket.io' {
  export * from '@types/socket.io';
} 