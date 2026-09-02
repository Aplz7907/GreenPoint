import { createAdminClient, createClient } from '@/lib/supabase/server'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
    // 1. สร้าง client เพื่อตรวจสอบสิทธิ์ผู้ใช้ที่เรียก API นี้
    const supabase = createClient()

    // 2. ดึงข้อมูลผู้ใช้ที่ล็อกอินอยู่
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        return new NextResponse('Unauthorized', { status: 401 })
    }

    // 3. ตรวจสอบว่าผู้ใช้ที่เรียก API เป็นแอดมินหรือไม่
    // หมายเหตุ: คุณต้องเพิ่มคอลัมน์ `is_admin` (boolean) ในตาราง `profiles` ของคุณก่อน
    const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()

    if (!profile || !profile.is_admin) {
        return new NextResponse('Forbidden: User is not an admin', { status: 403 })
    }

    // 4. ดึง user_id ที่ต้องการลบจาก request body
    let userIdToDelete: string
    try {
        const body = await request.json()
        userIdToDelete = body.userId
        if (!userIdToDelete) {
            return NextResponse.json({ error: 'userId is required' }, { status: 400 })
        }
    } catch (e) {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    // 5. สร้าง admin client เพื่อทำการลบผู้ใช้
    const supabaseAdmin = createAdminClient()

    // 6. สั่งลบผู้ใช้ผ่าน Admin API
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
        userIdToDelete
    )

    if (deleteError) {
        console.error('Error deleting user:', deleteError.message)
        return NextResponse.json(
            { error: `Failed to delete user: ${deleteError.message}` },
            { status: 500 }
        )
    }

    // 7. ส่งคำตอบว่าทำสำเร็จ
    return NextResponse.json({
        message: `User ${userIdToDelete} deleted successfully.`,
    })
}
