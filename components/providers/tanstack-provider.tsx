"use client";
import {
  useQuery,
  useMutation,
  useQueryClient,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useState } from 'react';

interface TanstackProvviderProps {
    children : React.ReactNode;
}


export const TanstackProvvider  = ({children}:TanstackProvviderProps) => {
    const [queryClient] = useState(()=> new QueryClient());
    return (
        <QueryClientProvider client = {queryClient}>{children}</QueryClientProvider>
    );
};