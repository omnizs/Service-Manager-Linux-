!macro customInstall
  CopyFiles "$INSTDIR\Uninstall ${PRODUCT_NAME}.exe" "$INSTDIR\uninstaller.exe"
!macroend

!macro customUnInstall
  Delete "$INSTDIR\uninstaller.exe"
!macroend

