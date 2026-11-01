cmake_minimum_required(VERSION 3.21)

# 学习助手桌面应用（Qt 6 + Qt Quick / QML）。
# 当前阶段只有主页面骨架，不含任何业务功能。
project(infinite_tokens VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt6 6.2 REQUIRED COMPONENTS Quick)

qt_add_executable(infinite-tokens
    src/ui/main.cpp
)

# QML 走资源文件：路径固定为 qrc:/src/ui/qml/Main.qml，
# 不依赖 qt_add_qml_module 的资源前缀差异，Qt 6.2 起行为一致。
qt_add_resources(infinite-tokens "qml"
    PREFIX "/"
    FILES
        src/ui/qml/Main.qml
        src/ui/qml/RailButton.qml
        src/ui/qml/HeaderButton.qml
        src/ui/qml/SubjectRow.qml
        src/ui/qml/GlyphIcon.qml
        src/ui/qml/Theme.js
)

target_link_libraries(infinite-tokens PRIVATE Qt6::Quick)

set_target_properties(infinite-tokens PROPERTIES
    WIN32_EXECUTABLE TRUE
    MACOSX_BUNDLE TRUE
    MACOSX_BUNDLE_BUNDLE_NAME "Infinite Tokens"
    MACOSX_BUNDLE_GUI_IDENTIFIER "com.inotfrk.infinitetokens"
)

install(TARGETS infinite-tokens
    BUNDLE DESTINATION .
    RUNTIME DESTINATION bin
)
