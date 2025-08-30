//import { FC, createContext, ReactNode, useContext, useState } from 'react';
//import { User } from 'firebase/auth';

//type TUserContextType = {
//  user: User | null;
//  setUser: (user: User | null) => void;
//};

//type TUserProviderProps = {
//  children: React.ReactNode;
//};

//const initialUserContext: TUserContextType = {
//  user: null,
//  setUser: () => {}
//};

//const UserContext = createContext<TUserContextType>(initialUserContext);

//export const UserProvider: FC<TUserProviderProps> = ({
//  children
//}: {
//  children: ReactNode;
//}) => {
//  const [user, setUser] = useState<User | null>(null);

//  return (
//    <UserContext.Provider value={{ user, setUser }}>
//      {children}
//    </UserContext.Provider>
//  );
//};

//export const useUser = () => useContext(UserContext);
