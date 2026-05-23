$docxPath = "D:\01_Work\Web Apps\Archived Projects\eventpass\docs\EventPass-Technical-Overview.docx"
$pdfPath = "D:\01_Work\Web Apps\Archived Projects\eventpass\docs\EventPass-Technical-Overview.pdf"

$word = New-Object -ComObject Word.Application
$word.Visible = $false
$doc = $word.Documents.Open($docxPath)
$doc.SaveAs([ref]$pdfPath, [ref]17)
$doc.Close()
$word.Quit()
[System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null

Write-Host "PDF generated from Word: $pdfPath"
