import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                    supabaseResponse = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const {
        data: { user },
    } = await supabase.auth.getUser();

    const isAuthRoute = request.nextUrl.pathname.startsWith('/auth');
    const isStudentRoute = request.nextUrl.pathname.startsWith('/student');
    const isTeacherRoute = request.nextUrl.pathname.startsWith('/teacher');

    if (!user && (isStudentRoute || isTeacherRoute)) {
        const url = request.nextUrl.clone();
        url.pathname = '/auth/login';
        return NextResponse.redirect(url);
    }

    if (user) {
        const role = user.user_metadata?.role || 'student';

        if (isAuthRoute) {
            const url = request.nextUrl.clone();
            url.pathname = role === 'teacher' ? '/teacher/dashboard' : '/student/dashboard';
            return NextResponse.redirect(url);
        }

        if (isStudentRoute && role === 'teacher') {
            const url = request.nextUrl.clone();
            url.pathname = '/teacher/dashboard';
            return NextResponse.redirect(url);
        }

        if (isTeacherRoute && role === 'student') {
            const url = request.nextUrl.clone();
            url.pathname = '/student/dashboard';
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};

