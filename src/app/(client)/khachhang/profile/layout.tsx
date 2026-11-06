import { redirect } from 'next/navigation';
import { getPatientSession } from '@/server/auth/patient-session';
export default async function PatientProfileLayout({children}:{children:React.ReactNode}){const session=await getPatientSession();if(!session)redirect('/dang-nhap/khach-hang');return children}
