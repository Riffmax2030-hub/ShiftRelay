using System;
using System.Diagnostics;
using System.IO;

class Program {
    static int Main(string[] args) {
        try {
            string appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            string bridgeScript = Path.Combine(appData, "npm", "gemini-bridge.mjs");
            
            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = "node.exe";
            
            string cmdArgs = "\"" + bridgeScript + "\"";
            foreach (string arg in args) {
                string escaped = arg.Replace("\"", "\\\"");
                cmdArgs += " \"" + escaped + "\"";
            }
            psi.Arguments = cmdArgs;
            psi.UseShellExecute = false;
            
            Process p = Process.Start(psi);
            if (p == null) return 1;
            p.WaitForExit();
            return p.ExitCode;
        } catch (Exception ex) {
            Console.Error.WriteLine("gemini-launcher error: " + ex.Message);
            return 1;
        }
    }
}
